import React from 'react';
import { ExchangeScreen } from '../../src/screens/ExchangeScreen';
import { useRouter } from 'expo-router';

export default function ExchangeTab() {
  const router = useRouter();

  return <ExchangeScreen navigation={router} />;
} 