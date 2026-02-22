import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const COLORS = {
  primary: '#2D7A3E',
  darkGreen: '#1a4d2e',
  accent: '#F2E416',
  bg: '#FFFFFF',
  text: '#1F2937',
  lightGray: '#F3F4F6',
  mediumGray: '#9CA3AF',
  border: '#D1D5DB',
  seal: '#1F2937',
};

const styles = StyleSheet.create({
  page: {
    padding: 50,
    backgroundColor: COLORS.bg,
    fontFamily: 'Helvetica',
  },
  
  // Official Header Section
  officialHeader: {
    textAlign: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
  },
  republicText: {
    fontSize: 9,
    color: COLORS.text,
    marginBottom: 3,
    letterSpacing: 1,
  },
  organizationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkGreen,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  organizationSubtitle: {
    fontSize: 8,
    color: COLORS.mediumGray,
    marginBottom: 15,
    letterSpacing: 2,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 10,
    letterSpacing: 1,
  },
  
  // Document Info Bar
  infoBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.lightGray,
    padding: 12,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  infoLabel: {
    fontSize: 7,
    color: COLORS.mediumGray,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 9,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  
  // Statistics Grid
  statsGrid: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    border: '1px solid #D1D5DB',
    padding: 15,
    backgroundColor: COLORS.bg,
  },
  statHeader: {
    fontSize: 7,
    color: COLORS.mediumGray,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGreen,
    marginBottom: 4,
  },
  statFooter: {
    fontSize: 7,
    color: COLORS.mediumGray,
    fontStyle: 'italic',
  },
  
  // Section Headers
  sectionHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.darkGreen,
    marginTop: 20,
    marginBottom: 12,
    paddingBottom: 6,
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    backgroundColor: COLORS.lightGray,
    padding: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Table Styles
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: COLORS.darkGreen,
    padding: 8,
    borderTopWidth: 2,
    borderTopColor: COLORS.darkGreen,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.bg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRowWinner: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  tableCell: {
    fontSize: 9,
    color: COLORS.text,
  },
  tableCellBold: {
    fontSize: 9,
    color: COLORS.darkGreen,
    fontWeight: 'bold',
  },
  
  // Column Widths
  rankCol: { width: '12%' },
  nameCol: { width: '50%' },
  votesCol: { width: '20%', textAlign: 'right' },
  percentCol: { width: '18%', textAlign: 'right' },
  
  // Winner Badge
  winnerBadge: {
    fontSize: 7,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  
  // Official Footer
  officialFooter: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
  },
  certificationText: {
    fontSize: 8,
    color: COLORS.text,
    marginBottom: 25,
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  signatureSection: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  signatureBox: {
    width: '45%',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: COLORS.text,
    marginTop: 30,
    paddingTop: 5,
  },
  signatureLabel: {
    fontSize: 8,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  signatureTitle: {
    fontSize: 7,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  
  // Document Footer
  documentFooter: {
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 7,
    color: COLORS.mediumGray,
    marginBottom: 3,
  },
  referenceNumber: {
    fontSize: 7,
    color: COLORS.text,
    fontFamily: 'Courier',
    marginTop: 5,
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
  const documentDate = new Date();
  const referenceNumber = `SVMPC-ER-${documentDate.getFullYear()}-${String(documentDate.getMonth() + 1).padStart(2, '0')}-${String(documentDate.getDate()).padStart(2, '0')}-${String(documentDate.getHours()).padStart(2, '0')}${String(documentDate.getMinutes()).padStart(2, '0')}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Official Header */}
        <View style={styles.officialHeader}>
          <Text style={styles.republicText}>REPUBLIC OF THE PHILIPPINES</Text>
          <Text style={styles.organizationName}>SAINT VINCENT MULTIPURPOSE COOPERATIVE</Text>
          <Text style={styles.organizationSubtitle}>OFFICIAL ELECTION COMMISSION</Text>
          <Text style={styles.documentTitle}>OFFICIAL ELECTION RESULTS CERTIFICATE</Text>
        </View>

        {/* Document Information Bar */}
        <View style={styles.infoBar}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Document No.</Text>
            <Text style={styles.infoValue}>{referenceNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date Issued</Text>
            <Text style={styles.infoValue}>{documentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Time Issued</Text>
            <Text style={styles.infoValue}>{documentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        </View>

        {/* Statistics Summary */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statHeader}>Voter Turnout</Text>
            <Text style={styles.statNumber}>{participationRate.toFixed(1)}%</Text>
            <Text style={styles.statFooter}>Participation Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statHeader}>Total Votes</Text>
            <Text style={styles.statNumber}>{totalVotes.toLocaleString()}</Text>
            <Text style={styles.statFooter}>Verified Ballots</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statHeader}>Registered</Text>
            <Text style={styles.statNumber}>{totalVoters.toLocaleString()}</Text>
            <Text style={styles.statFooter}>Eligible Voters</Text>
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
            <View key={pos.id} style={styles.table}>
              <Text style={styles.sectionHeader}>{pos.title}</Text>

              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.rankCol]}>RANK</Text>
                <Text style={[styles.tableHeaderText, styles.nameCol]}>CANDIDATE NAME</Text>
                <Text style={[styles.tableHeaderText, styles.votesCol]}>VOTES</Text>
                <Text style={[styles.tableHeaderText, styles.percentCol]}>PERCENTAGE</Text>
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
                    <Text style={[isWinner ? styles.tableCellBold : styles.tableCell, styles.rankCol]}>
                      {idx + 1}
                    </Text>
                    <Text style={[isWinner ? styles.tableCellBold : styles.tableCell, styles.nameCol]}>
                      {candidate.name.toUpperCase()}
                      {isWinner && <Text style={styles.winnerBadge}> ★ ELECTED</Text>}
                    </Text>
                    <Text style={[isWinner ? styles.tableCellBold : styles.tableCell, styles.votesCol]}>
                      {candidate.votes.toLocaleString()}
                    </Text>
                    <Text style={[isWinner ? styles.tableCellBold : styles.tableCell, styles.percentCol]}>
                      {pct.toFixed(2)}%
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* Official Certification Footer */}
        <View style={styles.officialFooter}>
          <Text style={styles.certificationText}>
            This is to certify that the above election results are true and correct based on the official tally conducted by the Saint Vincent Multipurpose Cooperative Election Commission. All votes have been verified and counted in accordance with the cooperative's bylaws and election procedures.
          </Text>

          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>ELECTION COMMISSIONER</Text>
                <Text style={styles.signatureTitle}>Chairperson, Election Commission</Text>
              </View>
            </View>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>BOARD SECRETARY</Text>
                <Text style={styles.signatureTitle}>Board of Directors</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Document Footer */}
        <View style={styles.documentFooter}>
          <Text style={styles.footerText}>
            This document is computer-generated and requires no signature to be valid.
          </Text>
          <Text style={styles.footerText}>
            For verification purposes, please contact the SVMPC Election Commission.
          </Text>
          <Text style={styles.referenceNumber}>
            Reference: {referenceNumber}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ResultsPDF;
