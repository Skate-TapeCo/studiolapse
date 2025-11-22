// @ts-nocheck
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const BRAND_ORANGE = '#FF3A1E';
const BRAND_CHARCOAL = '#2A2F33';

export default function FAQScreen() {
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>How StudioLapse Works</Text>
      <Text style={s.subtitle}>FAQ & Tips</Text>

      <View style={s.block}>
        <Text style={s.q}>What does StudioLapse do?</Text>
        <Text style={s.a}>
          StudioLapse records your art sessions as regular videos and later combines them
          into a short timelapse. You can record multiple clips for the same project and
          export them into one final video.
        </Text>
      </View>

      <View style={s.block}>
        <Text style={s.q}>How do projects work?</Text>
        <Text style={s.a}>
          Create a project on the Projects tab, give it a name, and select it. Any clips
          you record while that project is selected will be saved to that project. You can
          view and delete clips from the project screen.
        </Text>
      </View>

      <View style={s.block}>
        <Text style={s.q}>Why does export take a while?</Text>
        <Text style={s.a}>
          Export is done on your phone's CPU using FFmpeg. Long sessions (for example,
          30+ minutes of footage) can take several minutes to prepare and export, especially
          on older devices. The progress bar shows how far through the final timelapse
          length the export is. The goal is to offer optional server-based exports in a Pro 
          tier so long timelapses can render significantly faster.
        </Text>
      </View>

      <View style={s.block}>
        <Text style={s.q}>What is the watermark?</Text>
        <Text style={s.a}>
          The free version of StudioLapse adds a small StudioLapse logo watermark near the
          bottom-right of the exported timelapse. This helps support development and lets
          people know which app was used to create the video.
        </Text>
      </View>

      <View style={s.block}>
        <Text style={s.q}>Will I be able to remove the watermark?</Text>
        <Text style={s.a}>
          A Pro upgrade is planned that will let you export without a watermark and unlock
          extra features. For now, the watermark is always added on export in this version.
        </Text>
      </View>

      <View style={s.block}>
        <Text style={s.q}>Can I use my phone while export runs?</Text>
        <Text style={s.a}>
          Yes. Once export starts, StudioLapse can continue working in the background, but
          it's best not to close the app from the recent apps screen until the export
          finishes.
        </Text>
      </View>

      <View style={s.block}>
        <Text style={s.q}>Any tips for smoother exports?</Text>
        <Text style={s.a}>
          Try to keep your phone plugged in and avoid recording extremely long single clips
          when possible. Several mid-length clips usually feel better than one very long
          clip when exporting.
        </Text>
      </View>

      <View style={s.block}>
        <Text style={s.q}>Where does Pro upgrade money go?</Text>
        <Text style={s.a}>
          Future Pro purchases will go directly into improving StudioLapse — better stability,
          new creative features, and eventually moving exports to a server for much faster processing
          on longer sessions.
        </Text>
      </View>

      <Text style={s.footer}>More questions? Future updates will expand this FAQ.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '900', color: BRAND_CHARCOAL },
  subtitle: { fontSize: 14, color: BRAND_ORANGE, marginTop: 4, marginBottom: 16 },
  block: { marginBottom: 16 },
  q: { fontSize: 16, fontWeight: '800', color: BRAND_CHARCOAL, marginBottom: 4 },
  a: { fontSize: 14, color: '#444', lineHeight: 20 },
  footer: { marginTop: 12, fontSize: 12, color: '#777' },
});
