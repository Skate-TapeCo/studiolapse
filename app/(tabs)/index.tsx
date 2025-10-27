import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeTab() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>StudioLapse</Text>
      <Text style={styles.subtitle}>Record an art session and save a clip</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.push('/camera')}>
        <Text style={styles.buttonText}>Record Session</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, alignItems:'center', justifyContent:'center', padding:24 },
  title:{ fontSize:28, fontWeight:'700', marginBottom:8 },
  subtitle:{ color:'#666', marginBottom:24, textAlign:'center' },
  button:{ backgroundColor:'#111', paddingHorizontal:20, paddingVertical:12, borderRadius:10 },
  buttonText:{ color:'#fff', fontSize:16, fontWeight:'600' }
});
