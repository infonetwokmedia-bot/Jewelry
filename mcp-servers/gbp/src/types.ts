// Google Business Profile - TypeScript interfaces
// Maps to the actual Google Business Profile API v4 + Performance API v1

export interface GBPConfig {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    accountId: string;
    locationId: string;
}

// Account Management API v1
export interface Account {
    name: string;
    accountName: string;
    type: 'PERSONAL' | 'LOCATION_GROUP' | 'USER_GROUP' | 'ORGANIZATION';
    role: 'PRIMARY_OWNER' | 'OWNER' | 'MANAGER' | 'SITE_MANAGER';
    state: { status: string };
}

// Business Information API v1
export interface Location {
    name: string;
    title: string;
    phoneNumbers?: { primaryPhone?: string; additionalPhones?: string[] };
    categories?: { primaryCategory?: Category; additionalCategories?: Category[] };
    storefrontAddress?: PostalAddress;
    websiteUri?: string;
    regularHours?: BusinessHours;
    specialHours?: { specialHourPeriods?: SpecialHourPeriod[] };
    profile?: { description?: string };
    openInfo?: { status?: string; canReopen?: boolean };
    metadata?: { mapsUri?: string; newReviewUri?: string };
}

export interface Category {
    name: string;
    displayName: string;
}

export interface PostalAddress {
    regionCode: string;
    languageCode: string;
    postalCode: string;
    administrativeArea: string;
    locality: string;
    addressLines: string[];
}

export interface BusinessHours {
    periods: TimePeriod[];
}

export interface TimePeriod {
    openDay: string;
    openTime: TimeOfDay;
    closeDay: string;
    closeTime: TimeOfDay;
}

export interface TimeOfDay {
    hours: number;
    minutes: number;
}

export interface SpecialHourPeriod {
    startDate: DateValue;
    openTime?: TimeOfDay;
    endDate: DateValue;
    closeTime?: TimeOfDay;
    closed?: boolean;
}

export interface DateValue {
    year: number;
    month: number;
    day: number;
}

// Reviews (Google My Business API v4)
export interface Review {
    name: string;
    reviewId: string;
    reviewer: { displayName: string; profilePhotoUrl?: string };
    starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
    comment?: string;
    createTime: string;
    updateTime: string;
    reviewReply?: ReviewReply;
}

export interface ReviewReply {
    comment: string;
    updateTime: string;
}

export interface ListReviewsResponse {
    reviews: Review[];
    averageRating: number;
    totalReviewCount: number;
    nextPageToken?: string;
}

// Local Posts (Google My Business API v4)
export interface LocalPost {
    name: string;
    languageCode: string;
    summary: string;
    callToAction?: CallToAction;
    media?: MediaItem[];
    state: string;
    topicType: 'STANDARD' | 'EVENT' | 'OFFER' | 'ALERT';
    createTime: string;
    updateTime: string;
    event?: LocalPostEvent;
    offer?: LocalPostOffer;
}

export interface CallToAction {
    actionType: 'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL';
    url: string;
}

export interface LocalPostEvent {
    title: string;
    schedule: { startDate: DateValue; startTime?: TimeOfDay; endDate: DateValue; endTime?: TimeOfDay };
}

export interface LocalPostOffer {
    couponCode?: string;
    redeemOnlineUrl?: string;
    termsConditions?: string;
}

// Media (Google My Business API v4)
export interface MediaItem {
    name: string;
    mediaFormat: 'PHOTO' | 'VIDEO';
    locationAssociation?: { category: string };
    googleUrl?: string;
    thumbnailUrl?: string;
    createTime: string;
    dimensions?: { widthPixels: number; heightPixels: number };
    sourceUrl?: string;
}

// Q&A (My Business Q&A API)
export interface Question {
    name: string;
    author: { displayName: string; profilePhotoUri?: string; type: string };
    text: string;
    createTime: string;
    updateTime: string;
    upvoteCount: number;
    totalAnswerCount: number;
    topAnswers?: Answer[];
}

export interface Answer {
    name: string;
    author: { displayName: string; profilePhotoUri?: string; type: string };
    text: string;
    createTime: string;
    updateTime: string;
    upvoteCount: number;
}

// Performance API v1
export interface DailyMetricTimeSeries {
    dailyMetric: string;
    dailySubEntityType?: { dayOfWeek?: string; timeOfDay?: TimeOfDay };
    timeSeries: { datedValues: DatedValue[] };
}

export interface DatedValue {
    date: DateValue;
    value?: string;
}

export interface MultiDailyMetricsResponse {
    multiDailyMetricTimeSeries: DailyMetricTimeSeries[];
}

// Available daily metrics
export type DailyMetric =
    | 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS'
    | 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH'
    | 'BUSINESS_IMPRESSIONS_MOBILE_MAPS'
    | 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH'
    | 'BUSINESS_CONVERSATIONS'
    | 'BUSINESS_DIRECTION_REQUESTS'
    | 'CALL_CLICKS'
    | 'WEBSITE_CLICKS'
    | 'BUSINESS_BOOKINGS'
    | 'BUSINESS_FOOD_ORDERS'
    | 'BUSINESS_FOOD_MENU_CLICKS';
