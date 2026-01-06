import React, { useEffect, useState } from 'react';
import { subscribeToApiLoading } from '../services/api.js';
import Preloader from './preloader.jsx';

export default function ApiLoadingOverlay() {
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    return subscribeToApiLoading((count) => setActiveCount(Number(count) || 0));
  }, []);

  if (activeCount <= 0) return null;
  return <Preloader fullScreen text="LOADING…" />;
}
