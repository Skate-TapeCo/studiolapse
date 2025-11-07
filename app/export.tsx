// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { FFmpegKit, ReturnCode } from 'kroog-ffmpeg-kit-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

type PendingExport = {
  projectId: string;
  projectName: string;
  targetDurationSec: number;
  clipUris: string[];
  createdAt: number;
};

const PENDING_KEY = 'studiolapse:pendingExport';
const DUR_CACHE_KEY = 'studiolapse:durations';
const BRAND_ORANGE = '#FF3A1E';
const BRAND_CHARCOAL = '#2A2F33';

function toFfmpegPath(uri: string) {
  const withoutScheme = uri.replace(/^file:\/\//, '');
  return withoutScheme.replace(/'/g, "'\\''");
}

async function probeDurationSec(inputPath: string) {
  const cmd = ['-hide_banner', '-i', inputPath, '-f', 'null', '-'].join(' ');
  const session = await FFmpegKit.execute(cmd);
  const logs = (await session.getAllLogsAsString?.()) || '';
  const m = logs.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
  if (!m) return 0;
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ss = parseFloat(m[3]);
  return hh * 3600 + mm * 60 + ss;
}

async function getClipDurationSec(uri: string) {
  try {
    const raw = await AsyncStorage.getItem(DUR_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    if (cache[uri]) return Number(cache[uri]) || 0;
    const path = uri.replace(/^file:\/\//, '');
    const sec = await probeDurationSec(path);
    cache[uri] = sec;
    await AsyncStorage.setItem(DUR_CACHE_KEY, JSON.stringify(cache));
    return sec;
  } catch {
    const pathFallback = uri.replace(/^file:\/\//, '');
    return probeDurationSec(pathFallback);
  }
}

export default function ExportScreen() {
  const router = useRouter();
  const [job, setJob] = useState<PendingExport | null>(null);
  const [concatPath, setConcatPath] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'preparing' | 'exporting'>('idle');
  const [dots, setDots] = useState('');

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    setJob(raw ? JSON.parse(raw) : null);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (status === 'idle') { setDots(''); return; }
    const t = setInterval(() => setDots(d => (d.length >= 3 ? '' : d + '.')), 500);
    return () => clearInterval(t);
  }, [status]);

  if (!job) {
    return (
      <View style={s.container}>
        <Text style={s.title}>Export</Text>
        <Text style={s.muted}>No pending export found.</Text>
        <Pressable style={s.charcoalBtn} onPress={() => router.back()}>
          <Text style={s.btnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Export Timelapse</Text>

      <View style={s.card}>
        <Text style={s.label}>Project</Text>
        <Text style={s.value}>{job.projectName}</Text>

        <Text style={s.label}>Final Length</Text>
        <Text style={s.value}>{job.targetDurationSec}s</Text>

        <Text style={s.label}>Clips ({job.clipUris.length})</Text>
        <FlatList
          data={job.clipUris}
          keyExtractor={(u) => u}
          renderItem={({ item, index }) => (
            <View style={s.clipRow}>
              <Text style={s.clipIdx}>{index + 1}.</Text>
              <Text style={s.clipUri} numberOfLines={1}>{item}</Text>
            </View>
          )}
          style={{ maxHeight: 200 }}
        />
      </View>

      <Pressable
        style={[s.charcoalBtn, (exporting || status !== 'idle') && { opacity: 0.6 }]}
        disabled={exporting || status !== 'idle'}
        onPress={async () => {
          try {
            const { status: perm } = await MediaLibrary.requestPermissionsAsync();
            if (perm !== 'granted') {
              Alert.alert('Permission needed', 'Media Library permission is required.');
              return;
            }

            setStatus('preparing');
            setExporting(true);
            await new Promise(r => setTimeout(r, 50));

            const lines = job.clipUris.map((u) => `file '${toFfmpegPath(u)}'`).join('\n');
            const listPath = `${FileSystem.cacheDirectory}studiolapse_concat_${Date.now()}.txt`;
            await FileSystem.writeAsStringAsync(listPath, lines);
            setConcatPath(listPath);

            let totalSec = 0;
            for (const u of job.clipUris) {
              totalSec += await getClipDurationSec(u);
            }
            const target = Math.max(1, Number(job.targetDurationSec || 1));
            let factor = totalSec > 0 ? totalSec / target : 1;
            if (factor < 1) factor = 1;

            const mmss = (s: number) => {
              const m = Math.floor(s / 60);
              const ss = Math.round(s % 60);
              return `${m}:${ss.toString().padStart(2, '0')}`;
            };

            const outPath = `${FileSystem.cacheDirectory}studiolapse_out_${Date.now()}.mp4`;
            const wmAsset = Asset.fromModule(require('../assets/watermark.png'));
            await wmAsset.downloadAsync();
            const wmPath = (wmAsset.localUri || wmAsset.uri || '').replace(/^file:\/\//, '');

            const filter =
              "[1:v]format=rgba,colorchannelmixer=aa=0.8[wm0];" +
              "[wm0][0:v]scale2ref=w=iw/3:h=-1[wm][base];" +
              "[base][wm]overlay=x=W-w-24:y=H-h[tmp];" +
              `[tmp]setpts=PTS/${factor}[v]`;

            const cmd = [
              '-hide_banner',
              '-y',
              '-f', 'concat',
              '-safe', '0',
              '-i', listPath,
              '-i', wmPath,
              '-an',
              '-filter_complex', filter,
              '-map', '[v]',
              '-c:v', 'mpeg4',
              '-q:v', '4',
              '-vsync', 'vfr',
              '-fps_mode', 'vfr',
              '-movflags', '+faststart',
              outPath
            ].map(part => (part.includes(' ') && !part.startsWith('-filter_complex') ? `"${part}"` : part)).join(' ');

            const doExport = async () => {
              setStatus('exporting');
              setExporting(true);

              const session = await FFmpegKit.execute(cmd);
              const rc = await session.getReturnCode();
              const logs = (await session.getAllLogsAsString?.()) || '';

              setExporting(false);
              setStatus('idle');

              if (ReturnCode.isSuccess(rc)) {
                const asset = await MediaLibrary.createAssetAsync(outPath);
                const album = await MediaLibrary.getAlbumAsync('StudioLapse');
                if (album) {
                  await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
                } else {
                  await MediaLibrary.createAlbumAsync('StudioLapse', asset, false);
                }
                Alert.alert('Exported', `Saved with watermark. Speed ≈ ${factor.toFixed(2)}x`);
              } else {
                Alert.alert('FFmpeg error', logs.slice(0, 1200));
              }
            };

            Alert.alert(
              'Export summary',
              `Clips: ${job.clipUris.length}\nTotal source: ${mmss(totalSec)}\nTarget: ${target}s\nSpeed: ~${factor.toFixed(2)}x`,
              [
                { text: 'Cancel', style: 'cancel', onPress: () => { setExporting(false); setStatus('idle'); } },
                { text: 'Proceed', onPress: doExport }
              ]
            );
          } catch (e: any) {
            setExporting(false);
            setStatus('idle');
            Alert.alert('Error', String(e?.message || e));
          }
        }}
      >
        <Text style={s.btnText}>
          {status === 'preparing' ? `Preparing${dots}` : exporting ? `Exporting${dots}` : 'Start Export'}
        </Text>
      </Pressable>

      {concatPath && (
        <Pressable
          style={s.charcoalBtn}
          onPress={async () => {
            await Clipboard.setStringAsync(concatPath);
            Alert.alert('Copied', 'Concat file path copied to clipboard.');
          }}
        >
          <Text style={s.btnText}>Copy Concat Path</Text>
        </Pressable>
      )}

      <Pressable
        style={s.charcoalBtn}
        onPress={async () => {
          await AsyncStorage.removeItem(PENDING_KEY);
          setJob(null);
          Alert.alert('Cleared', 'Pending export removed.');
        }}
      >
        <Text style={s.btnText}>Clear Pending Export</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12, color: BRAND_CHARCOAL },
  muted: { color: '#666', marginBottom: 12 },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, marginBottom: 16 },
  label: { fontSize: 12, color: '#666', marginTop: 8 },
  value: { fontSize: 16, fontWeight: '700', color: BRAND_CHARCOAL },
  clipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  clipIdx: { width: 22, textAlign: 'right', color: '#555' },
  clipUri: { flex: 1, color: '#333' },

  charcoalBtn: { backgroundColor: BRAND_CHARCOAL, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 10 },
  btnText: { color: '#fff', fontWeight: '800' },
});
