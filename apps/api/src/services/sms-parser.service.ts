// ============================================
// SMS Parser Service
// Parses bKash/Nagad/Rocket payment SMS
// ============================================

export type SmsProvider = 'BKASH' | 'NAGAD' | 'ROCKET' | 'UNKNOWN';

export interface ParsedSms {
  provider: SmsProvider;
  senderNumber: string | null;
  amount: number | null;
  txId: string | null;
  time: string | null;
  rawMessage: string;
  parsedAt: string;
}

// ============================================
// Regex patterns for each provider
// ============================================

const PATTERNS = {
  BKASH: {
    // "You have received Tk 4,752.00 from 01893671095. Fee Tk 0.00. Balance Tk 5,000.00. TrxID 8H4K9L2M at 02/10/2026 21:40"
    amount: /received\s+Tk\.?\s*([\d,]+\.?\d*)/i,
    sender: /from\s+(01[3-9]\d{8})/i,
    txId: /TrxID\s*:?\s*([A-Z0-9]{4,20})/i,
    time: /at\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/i,
  },
  NAGAD: {
    // "Amount: Tk 4,752.00, Sender: 01893671095, TxnID: 8H4K9L2M, Date: 02/10/2026 21:40"
    // Or: "Money Received. Tk 4,752.00 from 01893671095. TxnID 8H4K9L2M"
    amount: /(?:Amount|Money Received|Received)\.?\s*(?:Tk\.?|Tk)\s*([\d,]+\.?\d*)/i,
    sender: /(?:from|Sender)\s*:?\s*(01[3-9]\d{8})/i,
    txId: /(?:TxnID|TrxID|Txn Id)\s*:?\s*([A-Z0-9]{4,20})/i,
    time: /(?:Date|at)\s*:?\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/i,
  },
  ROCKET: {
    // "Money received from 01893671095. Amount: Tk. 4,752.00. TxnID: 8H4K9L2M"
    amount: /(?:Amount|Tk\.)\s*:?\s*Tk\.?\s*([\d,]+\.?\d*)/i,
    sender: /from\s+(01[3-9]\d{8})/i,
    txId: /(?:TxnID|TrxID)\s*:?\s*([A-Z0-9]{4,20})/i,
    time: /(?:at|Date:?)\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/i,
  },
};

// ============================================
// Helper: detect provider from SMS body
// ============================================

function detectProvider(from: string, message: string): SmsProvider {
  const text = `${from} ${message}`.toLowerCase();

  if (
    text.includes('bkash') ||
    text.includes('trxid') && text.includes('received tk')
  ) {
    return 'BKASH';
  }
  if (text.includes('nagad') || text.includes('txnid') && text.includes('money received')) {
    return 'NAGAD';
  }
  if (text.includes('rocket') || text.includes('dbbl') || text.includes('dutch-bangla')) {
    return 'ROCKET';
  }

  // Fallback: check pattern matches
  for (const [provider, patterns] of Object.entries(PATTERNS)) {
    if (patterns.amount.test(message) && patterns.txId.test(message)) {
      return provider as SmsProvider;
    }
  }

  return 'UNKNOWN';
}

// ============================================
// Parse SMS
// ============================================

export function parsePaymentSms(from: string, message: string): ParsedSms {
  const provider = detectProvider(from, message);

  if (provider === 'UNKNOWN') {
    return {
      provider: 'UNKNOWN',
      senderNumber: null,
      amount: null,
      txId: null,
      time: null,
      rawMessage: message,
      parsedAt: new Date().toISOString(),
    };
  }

  const patterns = PATTERNS[provider];

  // Extract values
  const amountMatch = message.match(patterns.amount);
  const senderMatch = message.match(patterns.sender);
  const txIdMatch = message.match(patterns.txId);
  const timeMatch = message.match(patterns.time);

  const amountStr = amountMatch?.[1]?.replace(/,/g, '') || null;
  const amount = amountStr ? parseFloat(amountStr) : null;

  return {
    provider,
    senderNumber: senderMatch?.[1] || null,
    amount,
    txId: txIdMatch?.[1]?.toUpperCase() || null,
    time: timeMatch?.[1] || null,
    rawMessage: message,
    parsedAt: new Date().toISOString(),
  };
}

// ============================================
// Test SMS Samples (for development)
// ============================================

export const SAMPLE_SMS = {
  BKASH:
    'You have received Tk 4,752.00 from 01893671095. Fee Tk 0.00. Balance Tk 5,000.00. TrxID 8H4K9L2M at 02/10/2026 21:40',
  NAGAD:
    'Money Received. Tk 4,752.00 from 01893671095. TxnID 8H4K9L2M. Date: 02/10/2026 21:40',
  ROCKET:
    'Money received from 01893671095. Amount: Tk. 4,752.00. TxnID: 8H4K9L2M',
};