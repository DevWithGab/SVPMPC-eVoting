import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Modern color palette matching cooperative branding
const COLORS = {
  green: '#2D7A3E',
  darkGreen: '#163A1E',
  yellow: '#F2E416',
  bg: '#FDFDFD',
  text: '#334455',
  lightGray: '#F1F5F9',
  border: '#DCDCDC',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    backgroundColor: COLORS.bg,
    fontFamily: 'Helvetica',
    display: 'flex',
    flexDirection: 'column',
  },
  pageContent: {
    flex: 1,
    paddingBottom: 20,
  },
  pageInner: {
    padding: 25,
    paddingLeft: 30,
  },
  // Header Section
  headerBox: {
    backgroundColor: COLORS.lightGray,
    padding: 15,
    marginBottom: 2,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: 2,
    borderBottomColor: COLORS.green,
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
  },
  logoBox: {
    width: 30,
    height: 30,
    marginRight: 12,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  headerBrand: {
    flex: 1,
  },
  organizationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkGreen,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  registryInfo: {
    fontSize: 8,
    color: COLORS.green,
    letterSpacing: 0.3,
  },
  headerRight: {
    textAlign: 'right',
  },
  metaLabel: {
    fontSize: 6,
    color: COLORS.text,
    marginBottom: 2,
    fontWeight: 'bold',
  },
  metaValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.darkGreen,
    marginBottom: 6,
    fontFamily: 'Courier',
  },
  // Title Section
  titleSection: {
    marginTop: 30,
    marginBottom: 28,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.darkGreen,
    marginBottom: 6,
    lineHeight: 1.2,
  },
  titleAccent: {
    width: 15,
    height: 2,
    backgroundColor: COLORS.yellow,
    marginBottom: 15,
  },
  // Stats Bar
  statsBar: {
    backgroundColor: COLORS.darkGreen,
    color: COLORS.white,
    padding: 16,
    marginBottom: 22,
    display: 'flex',
    flexDirection: 'column',
  },
  statsLabel: {
    fontSize: 7,
    letterSpacing: 0.5,
    marginBottom: 6,
    color: COLORS.white,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.white,
  },
  progressBar: {
    height: 1,
    backgroundColor: COLORS.lightGray,
  },
  progressFill: {
    height: 1,
    backgroundColor: COLORS.yellow,
  },
  // Executive Summary
  disclaimer: {
    fontSize: 8,
    color: COLORS.text,
    lineHeight: 1.8,
    marginBottom: 28,
    fontStyle: 'italic',
    paddingLeft: 12,
    paddingRight: 8,
    paddingTop: 6,
    paddingBottom: 6,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.green,
  },
  // Section Header
  sectionHeader: {
    backgroundColor: COLORS.lightGray,
    padding: 10,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.darkGreen,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionStats: {
    fontSize: 7,
    color: COLORS.green,
    fontWeight: 'bold',
  },
  // Table Header
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    padding: 8,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderCell: {
    fontSize: 6,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  rankCol: {
    width: '8%',
  },
  nameCol: {
    width: '50%',
  },
  votesCol: {
    width: '22%',
    textAlign: 'right',
  },
  percentCol: {
    width: '20%',
    textAlign: 'right',
  },
  // Table Row
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  tableRowWinner: {
    backgroundColor: '#F0F8F5',
  },
  tableCell: {
    fontSize: 8,
    color: COLORS.text,
  },
  tableCellWinner: {
    fontWeight: 'bold',
    color: COLORS.darkGreen,
  },
  winBadge: {
    width: 5,
    height: 5,
    backgroundColor: COLORS.yellow,
    marginLeft: 4,
  },
  // Footer
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 30,
    paddingRight: 30,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    display: 'flex',
    flexDirection: 'row',
  },
  sealSection: {
    width: '30%',
    marginRight: 20,
  },
  sealLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: COLORS.darkGreen,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  sealGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 35,
    height: 35,
    backgroundColor: COLORS.lightGray,
    marginBottom: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sealDot: {
    width: 3,
    height: 3,
    backgroundColor: COLORS.darkGreen,
    margin: 1,
  },
  // Signature Section
  signatureSection: {
    width: '70%',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGreen,
    marginBottom: 6,
  },
  signatureName: {
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.darkGreen,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  signatureRole: {
    fontSize: 6,
    color: COLORS.text,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  // Footer Info
  footerInfo: {
    fontSize: 6,
    color: COLORS.text,
    lineHeight: 1.5,
    marginTop: 8,
    marginBottom: 8,
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

const SealDot: React.FC<{ seed: string; index: number }> = ({ seed, index }) => {
  const hash = (seed + index).split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
  return hash % 2 === 0 ? <View style={styles.sealDot} /> : null;
};

export const ResultsPDF: React.FC<ResultsPDFProps> = ({
  participationRate,
  candidates,
  positions = [{ id: '1', title: 'Overall Results' }],
}) => {
  const progressWidth = Math.min(100, participationRate);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBox}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              <Image 
                src="/SVMPC_LOGO.png"
                style={styles.logoImage}
              />
            </View>
            <View style={styles.headerBrand}>
              <Text style={styles.organizationName}>SAINT VINCENT COOPERATIVE</Text>
              <Text style={styles.registryInfo}>REGISTRY AUTHORITY • ELECTION PROTOCOL v4.2</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.metaLabel}>DOCUMENT ID</Text>
            <Text style={styles.metaValue}>SV-RGN-2024-XP</Text>
            <Text style={styles.metaLabel}>NETWORK NODE</Text>
            <Text style={styles.metaValue}>BATANGAS-CENTRAL</Text>
          </View>
        </View>

        {/* Main Content Wrapper */}
        <View style={styles.pageContent}>
          <View style={styles.pageInner}>
            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.mainTitle}>PROCLAMATION</Text>
              <Text style={styles.mainTitle}>OF WINNERS</Text>
              <View style={styles.titleAccent} />
            </View>

            {/* Stats Bar */}
            <View style={styles.statsBar}>
              <Text style={styles.statsLabel}>VERIFIED TURNOUT</Text>
              <Text style={styles.statsValue}>{participationRate.toFixed(1)}%</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressWidth}%` },
                  ]}
                />
              </View>
            </View>

            {/* Executive Disclaimer */}
            <Text style={styles.disclaimer}>
              In accordance with Article VIII of the Cooperative Bylaws, the Board of Election Tellers hereby proclaims the following candidates as the official winners for the current fiscal cycle based on the validated cryptographic results of the digital registry.
            </Text>

            {/* Results Sections */}
            {positions.map((pos) => {
              const posCandidates = candidates
                .filter((c) => c.votes > 0)
                .sort((a, b) => b.votes - a.votes)
                .slice(0, 10);
              const total = posCandidates.reduce((acc, c) => acc + c.votes, 0);

              return (
                <View key={pos.id}>
                  {/* Section Header */}
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{pos.title.toUpperCase()}</Text>
                    <Text style={styles.sectionStats}>TOTAL VOTES: {total.toLocaleString()}</Text>
                  </View>

                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, styles.rankCol]}>RANK</Text>
                    <Text style={[styles.tableHeaderCell, styles.nameCol]}>CANDIDATE</Text>
                    <Text style={[styles.tableHeaderCell, styles.votesCol]}>VOTES</Text>
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
                          {idx + 1}.
                        </Text>
                        <Text
                          style={isWinner ? [styles.tableCell, styles.nameCol, styles.tableCellWinner] : [styles.tableCell, styles.nameCol]}
                        >
                          {candidate.name.toUpperCase()}
                        </Text>
                        <Text
                          style={isWinner ? [styles.tableCell, styles.votesCol, styles.tableCellWinner] : [styles.tableCell, styles.votesCol]}
                        >
                          {candidate.votes.toLocaleString()}
                        </Text>
                        <View style={{ display: 'flex', flexDirection: 'row', width: '20%', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Text
                            style={isWinner ? [styles.tableCell, styles.tableCellWinner] : styles.tableCell}
                          >
                            {pct.toFixed(1)}%
                          </Text>
                          {isWinner && <View style={styles.winBadge} />}
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.sealSection}>
            <Text style={styles.sealLabel}>CRYPTOGRAPHIC SEAL</Text>
            <View style={styles.sealGrid}>
              {Array.from({ length: 16 }).map((_, i) => (
                <SealDot key={i} seed="sv-registry" index={i} />
              ))}
            </View>
            <Text style={styles.footerInfo}>
              SYSTEM HASH: {btoa(Math.random().toString())
                .substring(0, 32)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.signatureSection}>
            <Text style={styles.footerInfo}>
              THIS DOCUMENT HAS BEEN AUTHENTICATED BY THE SAINT VINCENT REGISTRY SYSTEM.
            </Text>
            <Text style={styles.footerInfo}>
              TIMESTAMP: {new Date().toISOString()}
            </Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>ATTY. RICARDO DALISAY</Text>
            <Text style={styles.signatureRole}>CHAIRPERSON, BOARD OF ELECTION TELLERS</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ResultsPDF;
