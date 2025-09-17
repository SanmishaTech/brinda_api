// constants.js

const stateOptions = [
  { label: "Andhra Pradesh", value: "Andhra Pradesh" },
  { label: "Arunachal Pradesh", value: "Arunachal Pradesh" },
  { label: "Assam", value: "Assam" },
  { label: "Bihar", value: "Bihar" },
  { label: "Chhattisgarh", value: "Chhattisgarh" },
  { label: "Goa", value: "Goa" },
  { label: "Gujarat", value: "Gujarat" },
  { label: "Haryana", value: "Haryana" },
  { label: "Himachal Pradesh", value: "Himachal Pradesh" },
  { label: "Jharkhand", value: "Jharkhand" },
  { label: "Karnataka", value: "Karnataka" },
  { label: "Kerala", value: "Kerala" },
  { label: "Madhya Pradesh", value: "Madhya Pradesh" },
  { label: "Maharashtra", value: "Maharashtra" },
  { label: "Manipur", value: "Manipur" },
  { label: "Meghalaya", value: "Meghalaya" },
  { label: "Mizoram", value: "Mizoram" },
  { label: "Nagaland", value: "Nagaland" },
  { label: "Odisha", value: "Odisha" },
  { label: "Punjab", value: "Punjab" },
  { label: "Rajasthan", value: "Rajasthan" },
  { label: "Sikkim", value: "Sikkim" },
  { label: "Tamil Nadu", value: "Tamil Nadu" },
  { label: "Telangana", value: "Telangana" },
  { label: "Tripura", value: "Tripura" },
  { label: "Uttar Pradesh", value: "Uttar Pradesh" },
  { label: "Uttarakhand", value: "Uttarakhand" },
  { label: "West Bengal", value: "West Bengal" },
];

const GENDER_MALE = "Male";
const GENDER_FEMALE = "Female";
const GENDER_OTHER = "Other";

const LEFT = "Left";
const TOP = "Top";
const RIGHT = "Right";

const DEBIT = "Debit";
const CREDIT = "Credit";

const TRANSFERRED = "Transferred";
const APPROVED = "Approved";
const REJECTED = "Rejected";
const PENDING = "Pending";

const INCREMENT = "Increment";
const DECREMENT = "Decrement";
const MAHARASHTRA = "Maharashtra";
const FUND_WALLET = "FUND_WALLET";
const MATCHING_INCOME_WALLET = "MATCHING_INCOME_WALLET";
const UPGRADE_WALLET = "UPGRADE_WALLET";
const HOLD_WALLET = "HOLD_WALLET";
const FRANCHISE_WALLET = "FRANCHISE_WALLET";
//Member Status
const INACTIVE = "Inactive";
const ASSOCIATE = "Associate";
const SILVER = "Silver";
const GOLD = "Gold";
const DIAMOND = "Diamond";
const MAX_COMMISSIONS_PER_DAY = 25;
const ASSOCIATE_COMMISSION = 100;
const SILVER_COMMISSION = 200;
const GOLD_COMMISSION = 700;
const DIAMOND_COMMISSION = 1000;
const MINIMUM_MATCHING_COMMISSION_LIMIT = 100;
const MINIMUM_REPURCHASE_TOTAL = 700;
const TDS_PERCENT = 2;
const PLATFORM_CHARGE_PERCENT = 10;

// only for reference not using it
const MENTOR_COMMISSION_GROUPS = {
  1: "NoCondition",
  2: "Requires3Directs",
  3: "Requires3DirectsWith3Each",
};

const REPURCHASE_COMMISSIONS = [
  { level: 1, repurchasePercentage: 10, mentorPercentage: 5, group: 1 },
  { level: 2, repurchasePercentage: 5, mentorPercentage: 5, group: 1 },
  { level: 3, repurchasePercentage: 10, mentorPercentage: 10, group: 1 },
  { level: 4, repurchasePercentage: 5, mentorPercentage: 0, group: 2 },
  { level: 5, repurchasePercentage: 10, mentorPercentage: 0, group: 2 },
  { level: 6, repurchasePercentage: 5, mentorPercentage: 0, group: 2 },
  { level: 7, repurchasePercentage: 10, mentorPercentage: 0, group: 2 },
  { level: 8, repurchasePercentage: 15, mentorPercentage: 0, group: 3 },
  { level: 9, repurchasePercentage: 15, mentorPercentage: 0, group: 3 },
  { level: 10, repurchasePercentage: 15, mentorPercentage: 0, group: 3 },
];

// Repurchase
const CASHBACK_PERCENT = 5;

// virtual power start
const SELF = "SELF";
const SELF_PLUS_UPLINE = "SELF_PLUS_UPLINE";
// virtual power end

const REWARDS_COMMISSIONS = [
  { rewardLevel: 0, pair: 0, amount: 0, name: "Bronze" },
  { rewardLevel: 1, pair: 3, amount: 300, name: "Silver" },
  { rewardLevel: 2, pair: 5, amount: 500, name: "Gold" },
  { rewardLevel: 3, pair: 10, amount: 1000, name: "Platinum" },
  { rewardLevel: 4, pair: 25, amount: 2500, name: "Emerald" },
  { rewardLevel: 5, pair: 50, amount: 5000, name: "Topaz" },
  { rewardLevel: 6, pair: 100, amount: 10000, name: "Ruby Star" },
  { rewardLevel: 7, pair: 250, amount: 25000, name: "Sapphire" },
  { rewardLevel: 8, pair: 500, amount: 50000, name: "Star Sapphire" },
  { rewardLevel: 9, pair: 1000, amount: 100000, name: "Diamond" },
  { rewardLevel: 10, pair: 2500, amount: 250000, name: "Blue Diamond" },
  { rewardLevel: 11, pair: 5000, amount: 500000, name: "Black Diamond" },
  { rewardLevel: 12, pair: 10000, amount: 1000000, name: "Royal Diamond" },
  { rewardLevel: 13, pair: 25000, amount: 2500000, name: "Crown Diamond" },
  { rewardLevel: 14, pair: 50000, amount: 5000000, name: "Ambassador" },
  { rewardLevel: 15, pair: 100000, amount: 10000000, name: "Royal Ambassador" },
  { rewardLevel: 16, pair: 500000, amount: 50000000, name: "Crown Ambassador" },
  {
    rewardLevel: 17,
    pair: 1000000,
    amount: 100000000,
    name: "Brand Ambassador",
  },
];

module.exports = {
  stateOptions,
  GENDER_MALE,
  GENDER_FEMALE,
  GENDER_OTHER,
  LEFT,
  TOP,
  RIGHT,
  INACTIVE,
  PENDING,
  DEBIT,
  CREDIT,
  TRANSFERRED,
  APPROVED,
  REJECTED,
  MAHARASHTRA,
  INCREMENT,
  DECREMENT,
  ASSOCIATE,
  SILVER,
  GOLD,
  DIAMOND,
  MAX_COMMISSIONS_PER_DAY,
  ASSOCIATE_COMMISSION,
  SILVER_COMMISSION,
  GOLD_COMMISSION,
  DIAMOND_COMMISSION,
  MINIMUM_MATCHING_COMMISSION_LIMIT,
  CASHBACK_PERCENT,
  REPURCHASE_COMMISSIONS,
  MATCHING_INCOME_WALLET,
  FUND_WALLET,
  UPGRADE_WALLET,
  MINIMUM_REPURCHASE_TOTAL,
  TDS_PERCENT,
  PLATFORM_CHARGE_PERCENT,
  HOLD_WALLET,
  SELF,
  SELF_PLUS_UPLINE,
  REWARDS_COMMISSIONS,
  FRANCHISE_WALLET,
};
