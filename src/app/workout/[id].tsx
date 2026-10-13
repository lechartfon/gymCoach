import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { RestTimer } from '@/components/RestTimer';
import {
  AppTextInput,
  Card,
  Field,
  LoadingView,
  PrimaryButton,
  ScreenScroll,
  SecondaryButton,
  SectionTitle,
  uiStyles,
} from '@/components/ui';
import {
  completeSession,
  getLastWeightForExercise,
  getSessionDetail,
  logSet,
  markExerciseCompleted,
  removeSetLog,
  setExerciseNote,
  setSessionCurrentIndex,
  setSessionRest,
} from '@/db/repo';
import type { RestState, SessionDetail, SessionExerciseWithSets } from '@/db/types';
import { formatWeight, parseWeight } from '@/logic/format';
import { inactiveRest, pauseRest, resumeRest, startRest } from '@/logic/rest';
import { colors, radius, spacing } from '@/theme';

export default function WorkoutScreen() {
  useKeepAwake();

  const params = useLocalSearchParams<{ id: string }>();
  const sessionId = String(params.id);
  const db = useSQLiteContext();

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [index, setIndex] = useState(0);
  const [rest, setRest] = useState<RestState>(inactiveRest);
  const [restFinished, setRestFinished] = useState(false);
  const [weightText, setWeightText] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  const initializedRef = useRef(false);

  const prepareExercise = useCallback(
    async (exercise: SessionExerciseWithSets | undefined) => {
      if (!exercise) {
        return;
      }
      setNote(exercise.note);
      const lastLogged = exercise.sets
        .filter((set) => set.weightKg !== null)
        .sort((a, b) => b.setIndex - a.setIndex)[0];

      if (lastLogged && lastLogged.weightKg !== null) {
        setWeightText(formatWeight(lastLogged.weightKg));
        return;
      }
      if (!exercise.exerciseId) {
        setWeightText('');
        return;
      }
      const weight = await getLastWeightForExercise(db, exercise.exerciseId);
      setWeightText(weight !== null ? formatWeight(weight) : '');
    },
    [db]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await getSessionDetail(db, sessionId);
      if (!mounted) {
        return;
      }
      setDetail(data);
      if (data) {
        setRest({
          endsAt: data.session.restEndsAt,
          remainingMs: data.session.restRemainingMs,
          totalSeconds: data.session.restTotalSeconds,
        });
        if (!initializedRef.current) {
          initializedRef.current = true;
          const initialIndex = Math.min(
            data.session.currentIndex,
            Math.max(0, data.exercises.length - 1)
          );
          setIndex(initialIndex);
          await prepareExercise(data.exercises[initialIndex]);
        }
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [db, prepareExercise, sessionId]);

  const currentExercise = detail?.exercises[index] ?? null;

  const refresh = useCallback(async () => {
    const data = await getSessionDetail(db, sessionId);
    if (!data) {
      return;
    }
    setDetail(data);
    setRest({
      endsAt: data.session.restEndsAt,
      remainingMs: data.session.restRemainingMs,
      totalSeconds: data.session.restTotalSeconds,
    });
  }, [db, sessionId]);

  const saveNote = useCallback(async () => {
    if (!currentExercise) {
      return;
    }
    await setExerciseNote(db, currentExercise.id, note);
  }, [db, currentExercise, note]);

  const applyRest = useCallback(
    async (state: RestState) => {
      setRest(state);
      await setSessionRest(db, sessionId, state);
    },
    [db, sessionId]
  );

  const handleRestExpire = useCallback(async () => {
    setRestFinished(true);
    await applyRest(inactiveRest);
    setTimeout(() => setRestFinished(false), 4000);
  }, [applyRest]);

  const handleRestStart = useCallback(async () => {
    const seconds = currentExercise?.restSeconds ?? 0;
    if (seconds <= 0) {
      return;
    }
    setRestFinished(false);
    await applyRest(startRest(Date.now(), seconds));
  }, [applyRest, currentExercise]);

  const handleRestPause = useCallback(async () => {
    await applyRest(pauseRest(rest, Date.now()));
  }, [applyRest, rest]);

  const handleRestResume = useCallback(async () => {
    await applyRest(resumeRest(rest, Date.now()));
  }, [applyRest, rest]);

  const handleRestSkip = useCallback(async () => {
    setRestFinished(false);
    await applyRest(inactiveRest);
  }, [applyRest]);

  const handleToggleSet = useCallback(
    async (setIndex: number) => {
      if (!currentExercise) {
        return;
      }
      const logged = currentExercise.sets.find((set) => set.setIndex === setIndex);

      if (logged) {
        Alert.alert('Deshacer serie', `¿Quitar el registro de la serie ${setIndex}?`, [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Quitar',
            style: 'destructive',
            onPress: async () => {
              await removeSetLog(db, currentExercise.id, setIndex);
              const remainingCount = Math.max(0, currentExercise.sets.length - 1);
              await markExerciseCompleted(db, currentExercise.id, remainingCount >= currentExercise.targetSets);
              await refresh();
            },
          },
        ]);
        return;
      }

      const weight = parseWeight(weightText);
      await logSet(db, currentExercise.id, setIndex, weight);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

      const loggedCount = currentExercise.sets.length + 1;
      await markExerciseCompleted(db, currentExercise.id, loggedCount >= currentExercise.targetSets);

      if (setIndex < currentExercise.targetSets && currentExercise.restSeconds > 0) {
        setRestFinished(false);
        await applyRest(startRest(Date.now(), currentExercise.restSeconds));
      }
      await refresh();
    },
    [applyRest, currentExercise, db, refresh, weightText]
  );

  const goTo = useCallback(
    async (nextIndex: number) => {
      await saveNote();
      await setSessionCurrentIndex(db, sessionId, nextIndex);
      setIndex(nextIndex);
      await prepareExercise(detail?.exercises[nextIndex]);
    },
    [db, detail, prepareExercise, saveNote, sessionId]
  );

  const handleFinish = useCallback(async () => {
    await saveNote();
    await completeSession(db, sessionId);
    router.replace({ pathname: '/session/[id]', params: { id: sessionId } });
  }, [db, saveNote, sessionId]);

  const confirmFinish = useCallback(() => {
    if (!detail) {
      return;
    }
    const totalTarget = detail.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0);
    const totalLogged = detail.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
    if (totalLogged < totalTarget) {
      Alert.alert(
        'Entrenamiento incompleto',
        `Has registrado ${totalLogged} de ${totalTarget} series. ¿Quieres finalizar de todas formas?`,
        [
          { text: 'Seguir entrenando', style: 'cancel' },
          { text: 'Finalizar', style: 'destructive', onPress: handleFinish },
        ]
      );
      return;
    }
    handleFinish();
  }, [detail, handleFinish]);

  if (loading) {
    return <LoadingView />;
  }

  if (!detail) {
    return (
      <ScreenScroll>
        <Card>
          <Text style={uiStyles.dimText}>El entrenamiento ya no existe.</Text>
        </Card>
      </ScreenScroll>
    );
  }

  if (detail.session.status === 'completed') {
    return (
      <ScreenScroll>
        <Card>
          <Text style={styles.finishedTitle}>Este entrenamiento ya ha finalizado</Text>
          <PrimaryButton
            title="Ver resumen"
            onPress={() => router.replace({ pathname: '/session/[id]', params: { id: sessionId } })}
          />
        </Card>
      </ScreenScroll>
    );
  }

  if (!currentExercise) {
    return (
      <ScreenScroll>
        <Card>
          <Text style={styles.finishedTitle}>Esta rutina no tiene ejercicios</Text>
          <PrimaryButton title="Finalizar" onPress={confirmFinish} />
        </Card>
      </ScreenScroll>
    );
  }

  const loggedCount = currentExercise.sets.length;
  const allSetsLogged = loggedCount >= currentExercise.targetSets;
  const isLastExercise = index >= detail.exercises.length - 1;

  return (
    <ScreenScroll>
      <Text style={styles.progressLabel}>
        Ejercicio {index + 1} de {detail.exercises.length} · Rutina {detail.session.routineName}
      </Text>

      <Card>
        <Text style={styles.exerciseName}>{currentExercise.exerciseName}</Text>
        <Text style={styles.target}>
          {currentExercise.targetSets} series × {currentExercise.targetReps} reps
        </Text>
        {currentExercise.instructions ? (
          <Text style={styles.instructions}>{currentExercise.instructions}</Text>
        ) : null}
      </Card>

      <RestTimer
        rest={rest}
        defaultSeconds={currentExercise.restSeconds}
        finished={restFinished}
        onStart={handleRestStart}
        onPause={handleRestPause}
        onResume={handleRestResume}
        onSkip={handleRestSkip}
        onExpire={handleRestExpire}
      />

      <SectionTitle>
        Series ({loggedCount}/{currentExercise.targetSets})
      </SectionTitle>
      <Card>
        <Field label="Peso (kg)" hint="Se usará para la serie que marques a continuación.">
          <AppTextInput
            value={weightText}
            onChangeText={setWeightText}
            keyboardType="decimal-pad"
            placeholder="40"
          />
        </Field>

        <View style={styles.setRow}>
          {Array.from({ length: currentExercise.targetSets }, (_, i) => i + 1).map((setIndex) => {
            const logged = currentExercise.sets.find((set) => set.setIndex === setIndex);
            return (
              <Pressable
                key={setIndex}
                onPress={() => handleToggleSet(setIndex)}
                style={[styles.setChip, logged && styles.setChipDone]}
              >
                <Text style={[styles.setChipText, logged && styles.setChipTextDone]}>
                  {logged ? `✓ ${formatWeight(logged.weightKg)} kg` : `Serie ${setIndex}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <SectionTitle>Notas del ejercicio</SectionTitle>
      <Card>
        <AppTextInput
          value={note}
          onChangeText={setNote}
          onBlur={saveNote}
          placeholder="Pesos usados, sensaciones, molestias…"
          multiline
          numberOfLines={4}
          style={styles.noteInput}
        />
      </Card>

      <View style={styles.navRow}>
        <SecondaryButton
          title="← Anterior"
          onPress={() => goTo(index - 1)}
          disabled={index === 0}
          style={styles.navButton}
        />
        <SecondaryButton
          title="Saltar"
          onPress={() => goTo(index + 1)}
          disabled={isLastExercise}
          style={styles.navButton}
        />
      </View>

      {isLastExercise ? (
        <PrimaryButton title="Finalizar entrenamiento" onPress={confirmFinish} />
      ) : (
        <PrimaryButton title="Siguiente ejercicio →" onPress={() => goTo(index + 1)} disabled={!allSetsLogged} />
      )}

      {!allSetsLogged ? (
        <Text style={styles.hint}>Completa todas las series para pasar al siguiente ejercicio, o usa «Saltar».</Text>
      ) : null}

      <SecondaryButton title="Finalizar antes de tiempo" onPress={confirmFinish} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  progressLabel: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  exerciseName: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  target: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  instructions: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 20,
  },
  setRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  setChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minWidth: 96,
    alignItems: 'center',
  },
  setChipDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  setChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  setChipTextDone: {
    color: colors.accentText,
  },
  noteInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navButton: {
    flex: 1,
  },
  hint: {
    color: colors.textDim,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  finishedTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
});
