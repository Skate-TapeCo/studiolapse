// @ts-nocheck
import { Video } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Player() {
  const { uri } = useLocalSearchParams();
  const router = useRouter();
  const ref = useRef<Video | null>(null);
  const insets = useSafeAreaInsets();

  if (!uri) {
    return (
      <SafeAreaView style={s.center} edges={['top','bottom','left','right']}>
        <Text style={s.noVid}>No video</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.fallbackBtn}>
          <Text style={s.fallbackTxt}>Done</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.full} edges={['top','bottom','left','right']}>
      <Video
        ref={ref}
        style={s.video}
        source={{ uri: String(uri) }}
        useNativeControls
        resizeMode="contain"
        shouldPlay
      />

      <TouchableOpacity
        onPress={() => router.back()}
        style={[s.doneBtn, { top: insets.top + 8, left: insets.left + 8 }]}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Text style={s.doneTxt}>Done</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1, width: '100%', height: '100%' },
  doneBtn: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  doneTxt: { color: '#fff', fontWeight: '700' },
  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center'
  },
  noVid: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  fallbackBtn: {
    backgroundColor: '#222',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  fallbackTxt: { color: '#fff', fontWeight: '600' }
});
