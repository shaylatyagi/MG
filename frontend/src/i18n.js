import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "my_wallet": "My Wallet",
      "manage_earnings": "Manage your earnings and withdrawals.",
      "wallet_balance": "Wallet Balance",
      "withdraw_btn": "Withdraw to Bank",
      "total_paid": "Total Paid",
      "paid_today": "Paid Today",
      "pending_dues": "Pending Dues",
      "transactions": "Transactions",
      "bulk_sync": "Bulk Sync",
      "search": "Search...",
      "available_balance": "Available Balance"
    }
  },
  hi: {
    translation: {
      "my_wallet": "मेरा वॉलेट",
      "manage_earnings": "अपनी कमाई और निकासी का प्रबंधन करें।",
      "wallet_balance": "वॉलेट बैलेंस",
      "withdraw_btn": "बैंक में पैसे भेजें",
      "total_paid": "कुल भुगतान",
      "paid_today": "आज का भुगतान",
      "pending_dues": "बकाया राशि",
      "transactions": "लेन-देन (Transactions)",
      "bulk_sync": "सभी सिंक करें",
      "search": "खोजें...",
      "available_balance": "उपलब्ध बैलेंस"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // Default bhasha English set ki hai
    fallbackLng: "en",
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;