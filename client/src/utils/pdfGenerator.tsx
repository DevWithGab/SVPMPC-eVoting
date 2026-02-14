import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const COLORS = {
  primary: '#2D7A3E',
  accent: '#F2E416',
  bg: '#FFFFFF',
  text: '#1F2937',
  lightBg: '#F9FAFB',
  border: '#E5E7EB',
  accentLight: '#FEF9E7',
  primaryLight: '#E8F5E9',
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: COLORS.bg,
    fontFamily: 'Helvetica',
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 15,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 9,
    color: COLORS.text,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 8,
    color: COLORS.text,
    textAlign: 'right',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 20,
  },
  statsContainer: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 35,
    gap: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.primaryLight,
    padding: 22,
    borderRadius: 6,
    borderLeftWidth: 6,
    borderLeftColor: COLORS.accent,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  statBoxAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 60,
    height: 60,
    backgroundColor: COLORS.accentLight,
    borderRadius: 6,
    opacity: 0.5,
  },
  statLabel: {
    fontSize: 7,
    color: COLORS.primary,
    marginBottom: 10,
    fontWeight: 'bold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
    lineHeight: 1.2,
  },
  statSubtext: {
    fontSize: 7,
    color: COLORS.text,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 25,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: COLORS.lightBg,
    padding: 10,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  rankCol: {
    width: '10%',
  },
  nameCol: {
    width: '55%',
  },
  votesCol: {
    width: '20%',
    textAlign: 'right',
  },
  percentCol: {
    width: '15%',
    textAlign: 'right',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  tableRowWinner: {
    backgroundColor: COLORS.lightBg,
  },
  tableCell: {
    fontSize: 9,
    color: COLORS.text,
  },
  tableCellWinner: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    fontSize: 8,
    color: COLORS.text,
    textAlign: 'center',
  },
});

interface Candidate {
  id: string;
  name: string;
  votes: number;
}

interface Position {
  id: string;
  title: string;
}

interface ResultsPDFProps {
  participationRate: number;
  candidates: Candidate[];
  positions?: Position[];
  totalVotes: number;
  totalVoters: number;
}

export const ResultsPDF: React.FC<ResultsPDFProps> = ({
  participationRate,
  candidates,
  positions = [{ id: '1', title: 'Overall Results' }],
  totalVotes,
  totalVoters,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src="/SVMPC_LOGO.png" style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.title}>SAINT VINCENT COOPERATIVE</Text>
            <Text style={styles.subtitle}>Election Results Report</Text>
          </View>
          <Text style={styles.timestamp}>{new Date().toLocaleDateString()}</Text>
        </View>

        {/* Main Title */}
        <Text style={styles.mainTitle}>Election Results</Text>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <View style={styles.statBoxAccent} />
            <Text style={styles.statLabel}>Participation Rate</Text>
            <Text style={styles.statValue}>{participationRate.toFixed(1)}%</Text>
            <Text style={styles.statSubtext}>of eligible voters</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statBoxAccent} />
            <Text style={styles.statLabel}>Total Votes Cast</Text>
            <Text style={styles.statValue}>{totalVotes.toLocaleString()}</Text>
            <Text style={styles.statSubtext}>verified votes</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statBoxAccent} />
            <Text style={styles.statLabel}>Total Voters</Text>
            <Text style={styles.statValue}>{totalVoters.toLocaleString()}</Text>
            <Text style={styles.statSubtext}>registered members</Text>
          </View>
        </View>

        {/* Results by Position */}
        {positions.map((pos) => {
          const posCandidates = candidates
            .filter((c) => c.votes > 0)
            .sort((a, b) => b.votes - a.votes)
            .slice(0, 10);
          const total = posCandidates.reduce((acc, c) => acc + c.votes, 0);

          return (
            <View key={pos.id}>
              <Text style={styles.sectionTitle}>{pos.title}</Text>

              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.rankCol]}>Rank</Text>
                <Text style={[styles.tableHeaderCell, styles.nameCol]}>Candidate</Text>
                <Text style={[styles.tableHeaderCell, styles.votesCol]}>Votes</Text>
                <Text style={[styles.tableHeaderCell, styles.percentCol]}>%</Text>
              </View>

              {/* Table Rows */}
              {posCandidates.map((candidate, idx) => {
                const pct = total > 0 ? (candidate.votes / total) * 100 : 0;
                const isWinner = idx === 0;

                return (
                  <View
                    key={candidate.id}
                    style={isWinner ? [styles.tableRow, styles.tableRowWinner] : styles.tableRow}
                  >
                    <Text
                      style={isWinner ? [styles.tableCell, styles.rankCol, styles.tableCellWinner] : [styles.tableCell, styles.rankCol]}
                    >
                      {idx + 1}
                    </Text>
                    <Text
                      style={isWinner ? [styles.tableCell, styles.nameCol, styles.tableCellWinner] : [styles.tableCell, styles.nameCol]}
                    >
                      {candidate.name}
                    </Text>
                    <Text
                      style={isWinner ? [styles.tableCell, styles.votesCol, styles.tableCellWinner] : [styles.tableCell, styles.votesCol]}
                    >
                      {candidate.votes.toLocaleString()}
                    </Text>
                    <Text
                      style={isWinner ? [styles.tableCell, styles.percentCol, styles.tableCellWinner] : [styles.tableCell, styles.percentCol]}
                    >
                      {pct.toFixed(1)}%
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This report was generated on {new Date().toLocaleString()}. For official records, please verify with the election authority.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ResultsPDF;
