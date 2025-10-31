// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
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

function toFfmpegPath(uri: string) {
  const withoutScheme = uri.replace(/^file:\/\//, '');
  return withoutScheme.replace(/'/g, "'\\''");
}

export default function ExportScreen() {
  const router = useRouter();
  const [job, setJob] = useState<PendingExport | null>(null);
  const [concatPath, setConcatPath] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    setJob(raw ? JSON.parse(raw) : null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!job) {
    return (
      <View style={s.container}>
        <Text style={s.title}>Export</Text>
        <Text style={s.muted}>No pending export found.</Text>
        <Pressable style={s.primary} onPress={() => router.back()}>
          <Text style={s.primaryText}>Back</Text>
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
        style={[s.primary, exporting && { opacity: 0.6 }]}
        disabled={exporting}
        onPress={async () => {
          try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Media Library permission is required.');
              return;
            }

            const lines = job.clipUris.map((u) => `file '${toFfmpegPath(u)}'`).join('\n');
            const listPath = `${FileSystem.cacheDirectory}studiolapse_concat_${Date.now()}.txt`;
            await FileSystem.writeAsStringAsync(listPath, lines);
            setConcatPath(listPath);

            const outPath = `${FileSystem.cacheDirectory}studiolapse_out_${Date.now()}.mp4`;
            const cmd = [
              '-hide_banner',
              '-y',
              '-f', 'concat',
              '-safe', '0',
              '-i', listPath,
              '-c', 'copy',
              outPath
            ].map(part => (part.includes(' ') ? `"${part}"` : part)).join(' ');

            setExporting(true);
            const session = await FFmpegKit.execute(cmd);
            const rc = await session.getReturnCode();
            setExporting(false);

            if (ReturnCode.isSuccess(rc)) {
              const asset = await MediaLibrary.createAssetAsync(outPath);
              const album = await MediaLibrary.getAlbumAsync('StudioLapse');
              if (album) {
                await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
              } else {
                await MediaLibrary.createAlbumAsync('StudioLapse', asset, false);
              }
              Alert.alert('Exported', 'Saved to your StudioLapse album.');
            } else {
              const code = rc?.getValue?.() ?? String(rc);
              Alert.alert('FFmpeg error', `Code: ${code}`);
            }
          } catch (e: any) {
            setExporting(false);
            Alert.alert('Error', String(e?.message || e));
          }
        }}
      >
        <Text style={s.primaryText}>{exporting ? 'Exporting…' : 'Start Export'}</Text>
      </Pressable>

      {concatPath && (
        <Pressable
          style={s.secondary}
          onPress={async () => {
            await Clipboard.setStringAsync(concatPath);
            Alert.alert('Copied', 'Concat file path copied to clipboard.');
          }}
        >
          <Text style={s.secondaryText}>Copy Concat Path</Text>
        </Pressable>
      )}

      <Pressable
        style={s.secondary}
        onPress={async () => {
          await AsyncStorage.removeItem(PENDING_KEY);
          setJob(null);
          Alert.alert('Cleared', 'Pending export removed.');
        }}
      >
        <Text style={s.secondaryText}>Clear Pending Export</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12, color: '#111' },
  muted: { color: '#666', marginBottom: 12 },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, marginBottom: 16 },
  label: { fontSize: 12, color: '#666', marginTop: 8 },
  value: { fontSize: 16, fontWeight: '700', color: '#111' },
  clipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  clipIdx: { width: 22, textAlign: 'right', color: '#555' },
  clipUri: { flex: 1, color: '#333' },
  primary: { backgroundColor: '#1f6feb', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 10 },
  primaryText: { color: '#fff', fontWeight: '800' },
  secondary: { borderWidth: 1, borderColor: '#ccc', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 10 },
  secondaryText: { color: '#111', fontWeight: '700' },
});
