/** Choice lists from the prototype. Kept free of imports so client screens don't pull in the validation library. */
export const GENDERS = ['Female', 'Male', 'Other'] as const;
export const EDUCATION = ['Illiterate', 'Primary', 'Middle school', '10th pass', '12th pass', 'Graduate'] as const;
export const SOCIAL_CATS = ['General', 'OBC', 'SC', 'ST', 'Minority'] as const;

/** Future-plan goals: stored as the engine's Goal keys, shown with the prototype's wording. */
export const GOAL_LABELS = {
  increase_production: 'Increase production',
  add_new_products: 'Add new products',
  buy_new_equipment: 'Buy new equipment',
  expand_to_new_markets: 'Expand to new markets',
  hire_more_people: 'Hire more people',
  open_another_outlet: 'Open another outlet',
  sell_online: 'Sell online',
} as const;
export const CHANNELS = ['Local market', 'Wholesale', 'Retail shops', 'Online', 'Social media', 'WhatsApp', 'Door-to-door', 'Exhibitions / Melas'] as const;
export const PRICING_STRATEGIES = ['Lowest price', 'Premium quality', 'Value for money', 'Convenience'] as const;
