import React from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useChessStore } from '../../src/store';
import { BOARD_THEMES, type BoardTheme } from '../../src/store/slices/uiSlice';
import { serializePgn } from '../../src/pgn/pgnSerializer';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>Settings</Text>

        <EngineSection />
        <BoardSection />
        <ExplorerSection />
        <GameSection />
        <AboutSection />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Engine ────────────────────────────────────────────────────────────────────

function EngineSection() {
  const engineStatus = useChessStore((s) => s.engineStatus);
  const targetDepth = useChessStore((s) => s.targetDepth);
  const multiPvCount = useChessStore((s) => s.multiPvCount);
  const setTargetDepth = useChessStore((s) => s.setTargetDepth);
  const setMultiPv = useChessStore((s) => s.setMultiPv);

  const isUnsupported = engineStatus === 'unsupported';

  return (
    <Section title="Engine">
      {isUnsupported && (
        <Text style={styles.warningText}>
          Stockfish requires Expo Web (browser). Engine analysis is not available on native builds.
        </Text>
      )}

      <Row label="Analysis depth">
        <View style={styles.stepper}>
          <StepButton onPress={() => setTargetDepth(Math.max(10, targetDepth - 2))} label="−" />
          <Text style={styles.stepValue}>{targetDepth}</Text>
          <StepButton onPress={() => setTargetDepth(Math.min(30, targetDepth + 2))} label="+" />
        </View>
      </Row>

      <Row label="Lines (MultiPV)">
        <View style={styles.segmentGroup}>
          {[1, 2, 3].map((n) => (
            <Pressable
              key={n}
              style={[styles.segment, multiPvCount === n && styles.segmentActive]}
              onPress={() => setMultiPv(n)}
            >
              <Text style={[styles.segmentText, multiPvCount === n && styles.segmentTextActive]}>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>
      </Row>
    </Section>
  );
}

// ── Board ─────────────────────────────────────────────────────────────────────

const THEME_LABELS: Record<BoardTheme, string> = {
  classic: 'Classic',
  blue: 'Blue',
  walnut: 'Walnut',
};

function BoardSection() {
  const boardTheme = useChessStore((s) => s.boardTheme);
  const showCoordinates = useChessStore((s) => s.showCoordinates);
  const setBoardTheme = useChessStore((s) => s.setBoardTheme);
  const toggleCoordinates = useChessStore((s) => s.toggleCoordinates);

  return (
    <Section title="Board">
      <View style={styles.themeRow}>
        {(Object.keys(BOARD_THEMES) as BoardTheme[]).map((theme) => {
          const colors = BOARD_THEMES[theme];
          const isActive = boardTheme === theme;
          return (
            <Pressable
              key={theme}
              style={[styles.themeSwatch, isActive && styles.themeSwatchActive]}
              onPress={() => setBoardTheme(theme)}
              accessibilityLabel={`${THEME_LABELS[theme]} theme`}
            >
              {/* Mini board preview: 2×2 squares */}
              <View style={styles.miniBoard}>
                <View style={[styles.miniSquare, { backgroundColor: colors.white }]} />
                <View style={[styles.miniSquare, { backgroundColor: colors.black }]} />
                <View style={[styles.miniSquare, { backgroundColor: colors.black }]} />
                <View style={[styles.miniSquare, { backgroundColor: colors.white }]} />
              </View>
              <Text style={[styles.themeLabel, isActive && styles.themeLabelActive]}>
                {THEME_LABELS[theme]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Row label="Show coordinates">
        <Switch
          value={showCoordinates}
          onValueChange={toggleCoordinates}
          trackColor={{ false: '#2d2d4e', true: '#5c6bc0' }}
          thumbColor={showCoordinates ? '#a8b4ff' : '#666'}
        />
      </Row>
    </Section>
  );
}

// ── Opening Explorer ───────────────────────────────────────────────────────────

function ExplorerSection() {
  const explorerEnabled = useChessStore((s) => s.explorerEnabled);
  const toggleExplorer = useChessStore((s) => s.toggleExplorer);

  return (
    <Section title="Opening Explorer">
      <Row label="Enable Lichess Masters DB">
        <Switch
          value={explorerEnabled}
          onValueChange={toggleExplorer}
          trackColor={{ false: '#2d2d4e', true: '#5c6bc0' }}
          thumbColor={explorerEnabled ? '#a8b4ff' : '#666'}
        />
      </Row>
      <Text style={styles.hintText}>
        Fetches move frequency and win rates from the Lichess Masters database.
        Requires an internet connection.
      </Text>
    </Section>
  );
}

// ── Game ──────────────────────────────────────────────────────────────────────

function GameSection() {
  const moveTree = useChessStore((s) => s.moveTree);
  const metadata = useChessStore((s) => s.metadata);

  const handleExportPgn = async () => {
    if (!moveTree) {
      Alert.alert('No game', 'Import or play a game first.');
      return;
    }
    const pgn = serializePgn(moveTree, metadata);
    try {
      await Share.share({ message: pgn, title: 'Game PGN' });
    } catch {
      // Share sheet dismissed — no-op
    }
  };

  return (
    <Section title="Game">
      <Pressable
        style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
        onPress={handleExportPgn}
        disabled={!moveTree}
      >
        <Text style={[styles.actionBtnText, !moveTree && styles.actionBtnTextDisabled]}>
          Share / Export PGN
        </Text>
      </Pressable>
    </Section>
  );
}

// ── About ─────────────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <Section title="About">
      <Text style={styles.aboutText}>ClaudeCodeChess</Text>
      <Text style={styles.hintText}>
        Built with Expo, React Native, chess.js, and Stockfish 18.{'\n'}
        Opening data from Lichess Masters Database.
      </Text>
    </Section>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowControl}>{children}</View>
    </View>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
      onPress={onPress}
    >
      <Text style={styles.stepBtnText}>{label}</Text>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 8,
  },
  screenTitle: {
    color: '#e0e0ff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#7986cb',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionBody: {
    backgroundColor: '#12122a',
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2d2d4e',
  },
  rowLabel: {
    color: '#c0c0e0',
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  rowControl: {
    alignItems: 'flex-end',
  },

  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepBtn: {
    backgroundColor: '#2d2d4e',
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPressed: {
    backgroundColor: '#3d3d6e',
  },
  stepBtnText: {
    color: '#e0e0ff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  stepValue: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'center',
  },

  // Segment (MultiPV)
  segmentGroup: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    gap: 2,
  },
  segment: {
    backgroundColor: '#2d2d4e',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: '#3949ab',
  },
  segmentText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#e0e0ff',
  },

  // Board theme swatches
  themeRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2d2d4e',
  },
  themeSwatch: {
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeSwatchActive: {
    borderColor: '#7986cb',
  },
  miniBoard: {
    width: 40,
    height: 40,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 4,
    overflow: 'hidden',
  },
  miniSquare: {
    width: 20,
    height: 20,
  },
  themeLabel: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
  },
  themeLabelActive: {
    color: '#a8b4ff',
  },

  // Action button
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionBtnPressed: {
    backgroundColor: '#1e1e3a',
  },
  actionBtnText: {
    color: '#a8b4ff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionBtnTextDisabled: {
    color: '#444',
  },

  // Text
  warningText: {
    color: '#ffb74d',
    fontSize: 12,
    padding: 12,
    lineHeight: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2d2d4e',
  },
  hintText: {
    color: '#555',
    fontSize: 12,
    padding: 12,
    lineHeight: 18,
  },
  aboutText: {
    color: '#c0c0e0',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
