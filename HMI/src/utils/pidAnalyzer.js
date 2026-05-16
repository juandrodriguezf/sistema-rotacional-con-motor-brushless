// ===== DETECCIÓN DE ESCALÓN =====

export function detectStep(data, threshold = 5, minRate = 50) {
  if (data.length < 2) return null;

  let bestIdx = null;
  let bestDelta = 0;

  for (let i = 10; i < data.length; i++) {
    const dt = (data[i].time - data[i - 10].time) / 1000;
    if (dt <= 0) continue;

    const delta = Math.abs(data[i].sp - data[i - 10].sp);
    const rate = delta / dt;

    if (delta > threshold && rate > minRate && delta > bestDelta) {
      bestDelta = delta;
      bestIdx = i;
    }
  }

  return bestIdx;
}

// ===== ANÁLISIS DE RESPUESTA =====

export function analyzeResponse(data, stepIdx, windowMs = 5000) {
  if (!stepIdx || stepIdx >= data.length) return null;

  const tStep = data[stepIdx].time;
  const spTarget = data[stepIdx].sp;
  const spBefore = stepIdx > 0 ? data[stepIdx - 1].sp : spTarget;
  const change = Math.abs(spTarget - spBefore);

  if (change < 5) return null;

  const windowEnd = tStep + windowMs;
  const windowData = data.filter((d) => d.time >= tStep && d.time <= windowEnd);

  if (windowData.length < 10) return null;

  for (let i = 10; i < windowData.length; i++) {
    const dt = (windowData[i].time - windowData[i - 10].time) / 1000;
    if (dt <= 0) continue;
    const delta = Math.abs(windowData[i].sp - windowData[i - 10].sp);
    const rate = delta / dt;
    if (delta > 5 && rate > 50) return null;
  }

  const fbValues = windowData.map((d) => d.fb);
  const errValues = windowData.map((d) => d.err);
  const timeValues = windowData.map((d) => d.time);

  const fbStart = data[Math.max(0, stepIdx - 5)].fb;
  const fbMin = Math.min(...fbValues);
  const fbMax = Math.max(...fbValues);

  let overshoot = 0;
  if (spTarget > spBefore) {
    overshoot = ((fbMax - spTarget) / change) * 100;
  } else {
    overshoot = ((spTarget - fbMin) / change) * 100;
  }
  if (overshoot < 0) overshoot = 0;

  const threshold10 = spBefore + (spTarget - spBefore) * 0.1;
  const threshold90 = spBefore + (spTarget - spBefore) * 0.9;
  let t10 = null;
  let t90 = null;

  for (const d of windowData) {
    if (spTarget > spBefore) {
      if (t10 === null && d.fb >= threshold10) t10 = d.time;
      if (t10 !== null && t90 === null && d.fb >= threshold90) t90 = d.time;
    } else {
      if (t10 === null && d.fb <= threshold10) t10 = d.time;
      if (t10 !== null && t90 === null && d.fb <= threshold90) t90 = d.time;
    }
  }

  const riseTime = t10 !== null && t90 !== null ? (t90 - t10) / 1000 : null;

  const band = Math.abs(change) * 0.02;
  let settlingTime = null;
  let inBand = false;
  let bandStartTime = null;
  const settleHoldMs = 500;

  for (let i = 0; i < windowData.length; i++) {
    const err = Math.abs(windowData[i].fb - spTarget);
    if (err <= band) {
      if (!inBand) {
        inBand = true;
        bandStartTime = windowData[i].time;
      }
      const elapsed = windowData[i].time - bandStartTime;
      if (elapsed >= settleHoldMs && settlingTime === null) {
        settlingTime = (windowData[i].time - tStep) / 1000;
      }
    } else {
      inBand = false;
      bandStartTime = null;
    }
  }

  const lastSamples = windowData.slice(-Math.max(1, Math.floor(1500 / 8.33)));
  const steadyStateError = lastSamples.reduce((s, d) => s + Math.abs(d.err), 0) / lastSamples.length;

  let zeroCrossings = 0;
  let prevSide = windowData[0].fb > spTarget ? 1 : -1;
  for (let i = 1; i < windowData.length; i++) {
    const side = windowData[i].fb > spTarget ? 1 : -1;
    if (side !== prevSide) {
      zeroCrossings++;
      prevSide = side;
    }
  }
  const oscillationCount = Math.floor(zeroCrossings / 2);

  const peaks = [];
  for (let i = 2; i < fbValues.length - 2; i++) {
    const isMax = fbValues[i] > fbValues[i - 1] && fbValues[i] > fbValues[i + 1] && fbValues[i] > fbValues[i - 2] && fbValues[i] > fbValues[i + 2];
    const isMin = fbValues[i] < fbValues[i - 1] && fbValues[i] < fbValues[i + 1] && fbValues[i] < fbValues[i - 2] && fbValues[i] < fbValues[i + 2];
    if (isMax || isMin) {
      peaks.push({ time: timeValues[i], value: fbValues[i] });
    }
  }

  let dampingRatio = null;
  if (peaks.length >= 2) {
    const p1 = Math.abs(peaks[0].value - spTarget);
    const p2 = Math.abs(peaks[1].value - spTarget);
    if (p1 > 0) {
      dampingRatio = p1 > p2 ? (p1 - p2) / p1 : 0;
    }
  }

  return {
    overshoot: Math.round(overshoot * 10) / 10,
    riseTime: riseTime !== null ? Math.round(riseTime * 100) / 100 : null,
    settlingTime: settlingTime !== null ? Math.round(settlingTime * 100) / 100 : null,
    steadyStateError: Math.round(steadyStateError * 10) / 10,
    oscillationCount,
    dampingRatio: dampingRatio !== null ? Math.round(dampingRatio * 100) / 100 : null,
    change: Math.round(change * 10) / 10,
    spBefore: Math.round(spBefore * 10) / 10,
    spTarget: Math.round(spTarget * 10) / 10,
  };
}

// ===== CLASIFICACIÓN DE MÉTRICAS =====

function scoreOvershoot(val) {
  if (val <= 5) return { score: 1.0, label: 'Excelente', status: 'excellent' };
  if (val <= 10) return { score: 0.8, label: 'Bueno', status: 'good' };
  if (val <= 25) return { score: 0.5, label: 'Aceptable', status: 'warning' };
  return { score: 0.1, label: 'Alto', status: 'bad' };
}

function scoreSettlingTime(val) {
  if (val === null) return { score: 0.5, label: 'N/A', status: 'neutral' };
  if (val <= 0.5) return { score: 1.0, label: 'Excelente', status: 'excellent' };
  if (val <= 1.0) return { score: 0.8, label: 'Bueno', status: 'good' };
  if (val <= 3.0) return { score: 0.5, label: 'Aceptable', status: 'warning' };
  return { score: 0.1, label: 'Lento', status: 'bad' };
}

function scoreSteadyStateError(val) {
  if (val <= 0.5) return { score: 1.0, label: 'Excelente', status: 'excellent' };
  if (val <= 1.0) return { score: 0.8, label: 'Bueno', status: 'good' };
  if (val <= 3.0) return { score: 0.5, label: 'Aceptable', status: 'warning' };
  return { score: 0.1, label: 'Alto', status: 'bad' };
}

function scoreOscillations(val) {
  if (val === 0) return { score: 1.0, label: 'Excelente', status: 'excellent' };
  if (val === 1) return { score: 0.8, label: 'Bueno', status: 'good' };
  if (val <= 3) return { score: 0.5, label: 'Aceptable', status: 'warning' };
  return { score: 0.1, label: 'Excesivo', status: 'bad' };
}

function scoreRiseTime(val) {
  if (val === null) return { score: 0.5, label: 'N/A', status: 'neutral' };
  if (val <= 0.5) return { score: 1.0, label: 'Excelente', status: 'excellent' };
  if (val <= 1.0) return { score: 0.8, label: 'Bueno', status: 'good' };
  if (val <= 2.0) return { score: 0.5, label: 'Aceptable', status: 'warning' };
  return { score: 0.1, label: 'Lento', status: 'bad' };
}

export function scoreMetrics(metrics) {
  return {
    overshoot: scoreOvershoot(metrics.overshoot),
    settlingTime: scoreSettlingTime(metrics.settlingTime),
    steadyStateError: scoreSteadyStateError(metrics.steadyStateError),
    oscillations: scoreOscillations(metrics.oscillationCount),
    riseTime: scoreRiseTime(metrics.riseTime),
  };
}

export function calculateGlobalScore(scored) {
  const weights = {
    overshoot: 0.25,
    steadyStateError: 0.25,
    settlingTime: 0.20,
    oscillations: 0.20,
    riseTime: 0.10,
  };

  let total = 0;
  let weightSum = 0;

  for (const [key, w] of Object.entries(weights)) {
    if (scored[key] && scored[key].status !== 'neutral') {
      total += scored[key].score * w;
      weightSum += w;
    }
  }

  return weightSum > 0 ? Math.round((total / weightSum) * 100) : 50;
}

export function getVerdict(globalScore) {
  if (globalScore >= 95) return { label: 'Excelente', emoji: '🟢', color: 'var(--green-400)' };
  if (globalScore >= 80) return { label: 'Bueno', emoji: '🟢', color: 'var(--green-400)' };
  if (globalScore >= 60) return { label: 'Aceptable', emoji: '🟡', color: 'var(--yellow-400)' };
  if (globalScore >= 40) return { label: 'Regular', emoji: '🟠', color: 'var(--orange-400)' };
  return { label: 'Malo', emoji: '🔴', color: 'var(--red-400)' };
}

// ===== GENERACIÓN DE RECOMENDACIONES =====

export function generateRecommendation(metrics, currentParams) {
  let { kp, ki, kd } = currentParams;
  let newKp = kp;
  let newKi = ki;
  let newKd = kd;
  const suggestions = [];

  if (metrics.overshoot > 25) {
    newKp = Math.round(kp * 0.6);
    newKd = Math.max(0, kd + 8);
    suggestions.push('Overshoot muy alto → reducir Kp 40%, agregar Kd');
  } else if (metrics.overshoot > 10) {
    newKp = Math.round(kp * 0.75);
    newKd = Math.max(0, kd + 3);
    suggestions.push('Overshoot moderado → reducir Kp 25%, aumentar Kd');
  }

  if (metrics.oscillationCount > 4) {
    newKp = Math.round(newKp * 0.6);
    newKi = Math.round(newKi * 0.7);
    suggestions.push('Oscilaciones excesivas → reducir Kp y Ki');
  } else if (metrics.oscillationCount > 2) {
    newKp = Math.round(newKp * 0.85);
    suggestions.push('Oscilaciones leves → reducir Kp ligeramente');
  }

  if (metrics.steadyStateError > 3) {
    newKi = Math.min(100, Math.round(newKi * 1.8));
    suggestions.push('Error estacionario alto → aumentar Ki 80%');
  } else if (metrics.steadyStateError > 1) {
    newKi = Math.min(100, Math.round(newKi * 1.4));
    suggestions.push('Error estacionario moderado → aumentar Ki 40%');
  }

  if (metrics.riseTime !== null && metrics.riseTime > 2) {
    newKp = Math.min(200, Math.round(newKp * 1.4));
    suggestions.push('Respuesta muy lenta → aumentar Kp 40%');
  } else if (metrics.riseTime !== null && metrics.riseTime > 1 && metrics.overshoot < 5) {
    newKp = Math.min(200, Math.round(newKp * 1.15));
    suggestions.push('Respuesta lenta sin overshoot → aumentar Kp 15%');
  }

  if (metrics.overshoot <= 5 && metrics.steadyStateError <= 0.5 && metrics.oscillationCount <= 1) {
    return {
      params: { kp, ki, kd },
      suggestions: ['PID bien sintonizado — no se requieren cambios'],
      confidence: 'high',
    };
  }

  if (suggestions.length === 0 && metrics.change >= 5) {
    return {
      params: { kp, ki, kd },
      suggestions: ['Respuesta dentro de parámetros aceptables'],
      confidence: 'medium',
    };
  }

  newKp = Math.max(0, Math.min(200, newKp));
  newKi = Math.max(0, Math.min(100, newKi));
  newKd = Math.max(0, Math.min(100, newKd));

  const changed = [];
  if (newKp !== kp) changed.push({ param: 'Kp', from: kp, to: newKp });
  if (newKi !== ki) changed.push({ param: 'Ki', from: ki, to: newKi });
  if (newKd !== kd) changed.push({ param: 'Kd', from: kd, to: newKd });

  const confidence = changed.length >= 2 ? 'medium' : changed.length === 1 ? 'high' : 'low';

  return {
    params: { kp: newKp, ki: newKi, kd: newKd },
    suggestions,
    changes: changed,
    confidence,
  };
}
