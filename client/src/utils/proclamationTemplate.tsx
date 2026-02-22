import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const COLORS = {
  primary: '#2D7A3E',
  darkGreen: '#1a4d2e',
  accent: '#F2E416',
  gold: '#D4AF37',
  bg: '#FFFFFF',
  text: '#1F2937',
  lightGray: '#F9FAFB',
  mediumGray: '#9CA3AF',
  border: '#D1D5DB',
  sealColor: '#1F2937',
};

const styles = StyleSheet.create({
  page: {
    padding: 60,
    backgroundColor: COLORS.bg,
    fontFamily: 'Helvetica',
    lineHeight: 1.6,
  },
  
  // Header Section with Official Seal
  officialHeader: {
    textAlign: 'center',
    marginBottom: 40,
    paddingBottom: 25,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
  },
  republicHeader: {
    fontSize: 10,
    color: COLORS.sealColor,
    marginBottom: 2,
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  provinceHeader: {
    fontSize: 8,
    color: COLORS.mediumGray,
    marginBottom: 15,
    letterSpacing: 1.5,
  },
  cooperativeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 3,
    letterSpacing: 0.8,
  },
  cooperativeSubtitle: {
    fontSize: 9,
    color: COLORS.mediumGray,
    marginBottom: 20,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  documentType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.gold,
    marginTop: 15,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  
  // Document Information Bar
  infoBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.lightGray,
    padding: 15,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderRadius: 2,
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 8,
    color: COLORS.mediumGray,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoValue: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  
  // Proclamation Content
  proclamationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 25,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  whereasSection: {
    marginBottom: 20,
  },
  whereasHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.darkGreen,
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  whereasItem: {
    fontSize: 10,
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'justify',
    paddingLeft: 15,
    lineHeight: 1.5,
  },
  
  nowThereforeSection: {
    marginTop: 25,
    marginBottom: 30,
    padding: 20,
    backgroundColor: COLORS.lightGray,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.gold,
  },
  nowThereforeHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  proclamationText: {
    fontSize: 11,
    color: COLORS.text,
    textAlign: 'justify',
    lineHeight: 1.6,
    fontWeight: 'bold',
  },
  
  // Results Section (if applicable)
  resultsSection: {
    marginTop: 30,
    marginBottom: 30,
  },
  resultsHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultItem: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginBottom: 8,
    backgroundColor: COLORS.lightGray,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  positionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.darkGreen,
    flex: 1,
  },
  winnerName: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: 'bold',
    flex: 2,
    textAlign: 'center',
  },
  voteCount: {
    fontSize: 9,
    color: COLORS.mediumGray,
    flex: 1,
    textAlign: 'right',
  },
  
  // Official Certification
  certificationSection: {
    marginTop: 40,
    paddingTop: 25,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
  },
  certificationText: {
    fontSize: 10,
    color: COLORS.text,
    textAlign: 'justify',
    lineHeight: 1.5,
    marginBottom: 30,
    fontStyle: 'italic',
  },
  
  // Signature Section
  signatureSection: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  signatureBox: {
    width: '45%',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: COLORS.text,
    marginTop: 35,
    paddingTop: 8,
  },
  signatureLabel: {
    fontSize: 9,
    color: COLORS.text,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  signatureTitle: {
    fontSize: 8,
    color: COLORS.mediumGray,
    textAlign: 'center',
    marginTop: 3,
  },
  
  // Footer
  documentFooter: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 8,
    color: COLORS.mediumGray,
    marginBottom: 5,
  },
  referenceNumber: {
    fontSize: 8,
    color: COLORS.text,
    fontFamily: 'Courier',
    marginTop: 10,
    letterSpacing: 1,
  },
  
  // Date and Place
  datePlace: {
    textAlign: 'right',
    marginTop: 25,
    marginBottom: 25,
  },
  datePlaceText: {
    fontSize: 10,
    color: COLORS.text,
    fontStyle: 'italic',
  },
});

interface ProclamationData {
  title?: string;
  electionDate?: string;
  results?: Array<{
    position: string;
    winner: string;
    votes: number;
    totalVotes: number;
  }>;
  customContent?: string;
  issuedDate?: Date;
  issuedPlace?: string;
}

interface ProclamationTemplateProps {
  data?: ProclamationData;
  isTemplate?: boolean;
}

export const ProclamationTemplate: React.FC<ProclamationTemplateProps> = ({
  data = {},
  isTemplate = true,
}) => {
  const documentDate = data.issuedDate || new Date();
  const referenceNumber = `SVMPC-PROC-${documentDate.getFullYear()}-${String(documentDate.getMonth() + 1).padStart(2, '0')}-${String(documentDate.getDate()).padStart(2, '0')}-${String(documentDate.getHours()).padStart(2, '0')}${String(documentDate.getMinutes()).padStart(2, '0')}`;
  
  const defaultTitle = isTemplate 
    ? "[PROCLAMATION TITLE]" 
    : (data.title || "OFFICIAL PROCLAMATION");
  
  const defaultPlace = data.issuedPlace || "Brgy. Bagumbayan, Dupax del Sur, Nueva Vizcaya";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Official Header */}
        <View style={styles.officialHeader}>
          <Text style={styles.republicHeader}>REPUBLIC OF THE PHILIPPINES</Text>
          <Text style={styles.provinceHeader}>Province of Nueva Vizcaya</Text>
          <Text style={styles.cooperativeName}>SAINT VINCENT MULTIPURPOSE COOPERATIVE</Text>
          <Text style={styles.cooperativeSubtitle}>Board of Directors</Text>
          <Text style={styles.documentType}>OFFICIAL PROCLAMATION</Text>
        </View>

        {/* Document Information */}
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

        {/* Proclamation Title */}
        <Text style={styles.proclamationTitle}>{defaultTitle}</Text>

        {/* WHEREAS Section */}
        <View style={styles.whereasSection}>
          <Text style={styles.whereasHeader}>WHEREAS:</Text>
          
          {isTemplate ? (
            <>
              <Text style={styles.whereasItem}>
                The Saint Vincent Multipurpose Cooperative is a duly organized cooperative under the laws of the Republic of the Philippines;
              </Text>
              <Text style={styles.whereasItem}>
                [Insert specific reasons and background information relevant to this proclamation];
              </Text>
              <Text style={styles.whereasItem}>
                [Add additional WHEREAS clauses as needed to establish context and justification];
              </Text>
              <Text style={styles.whereasItem}>
                The Board of Directors, in its capacity as the governing body of the cooperative, has the authority to make official proclamations;
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.whereasItem}>
                The Saint Vincent Multipurpose Cooperative conducted its {data.electionDate ? `election on ${data.electionDate}` : 'regular election'} in accordance with the cooperative's bylaws and the Cooperative Code of the Philippines;
              </Text>
              <Text style={styles.whereasItem}>
                The election was conducted fairly, transparently, and in accordance with democratic principles and cooperative values;
              </Text>
              <Text style={styles.whereasItem}>
                The votes have been duly counted, verified, and certified by the Election Committee;
              </Text>
            </>
          )}
        </View>

        {/* NOW THEREFORE Section */}
        <View style={styles.nowThereforeSection}>
          <Text style={styles.nowThereforeHeader}>NOW, THEREFORE:</Text>
          <Text style={styles.proclamationText}>
            {isTemplate 
              ? "[Insert the main proclamation statement here. This is where you declare, announce, or proclaim the specific matter at hand. Be clear, concise, and authoritative in your language.]"
              : (data.customContent || "We hereby proclaim the official results of the election and recognize the duly elected officers of the Saint Vincent Multipurpose Cooperative.")
            }
          </Text>
        </View>

        {/* Results Section (if provided) */}
        {!isTemplate && data.results && data.results.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsHeader}>OFFICIAL ELECTION RESULTS</Text>
            {data.results.map((result, index) => (
              <View key={index} style={styles.resultItem}>
                <Text style={styles.positionTitle}>{result.position}</Text>
                <Text style={styles.winnerName}>{result.winner}</Text>
                <Text style={styles.voteCount}>{result.votes} votes</Text>
              </View>
            ))}
          </View>
        )}

        {/* Date and Place */}
        <View style={styles.datePlace}>
          <Text style={styles.datePlaceText}>
            Done in {defaultPlace}, this {documentDate.getDate()}
            {documentDate.getDate() === 1 ? 'st' : 
             documentDate.getDate() === 2 ? 'nd' : 
             documentDate.getDate() === 3 ? 'rd' : 'th'} day of{' '}
            {documentDate.toLocaleDateString('en-US', { month: 'long' })},{' '}
            {documentDate.getFullYear()}.
          </Text>
        </View>

        {/* Official Certification */}
        <View style={styles.certificationSection}>
          <Text style={styles.certificationText}>
            {isTemplate 
              ? "This proclamation is issued under the authority vested in the Board of Directors of the Saint Vincent Multipurpose Cooperative. [Add any additional certification or legal statements as required.]"
              : "This proclamation is issued in witness of the democratic process and in recognition of the will of the cooperative members as expressed through their votes."
            }
          </Text>

          {/* Signature Section */}
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>CHAIRPERSON</Text>
                <Text style={styles.signatureTitle}>Board of Directors</Text>
              </View>
            </View>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>SECRETARY</Text>
                <Text style={styles.signatureTitle}>Board of Directors</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Document Footer */}
        <View style={styles.documentFooter}>
          <Text style={styles.footerText}>
            This is an official document of the Saint Vincent Multipurpose Cooperative
          </Text>
          <Text style={styles.footerText}>
            For verification, contact the cooperative's main office
          </Text>
          <Text style={styles.referenceNumber}>
            Reference: {referenceNumber}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ProclamationTemplate;