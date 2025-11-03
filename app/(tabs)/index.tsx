// @ts-nocheck
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const BRAND_ORANGE = '#FF3A1E';
const BRAND_CHARCOAL = '#2A2F33';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={s.container}>
      <Text style={s.logo}>
        <Text style={s.logoStudio}>Studio</Text>
        <Text style={s.logoLapse}>Lapse</Text>
      </Text>

      <Pressable
        onPress={() => router.push('/camera')}
        style={s.recordBtn}
      >
        <Text style={s.recordText}>Record Session</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  logo: { fontSize: 40, fontWeight: '900', marginBottom: 28 },
  logoStudio: { color: BRAND_CHARCOAL },
  logoLapse: { color: BRAND_ORANGE },
  recordBtn: { backgroundColor: BRAND_CHARCOAL, paddingVertical: 14, paddingHorizontal: 22, borderRadius: 10 },
  recordText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
