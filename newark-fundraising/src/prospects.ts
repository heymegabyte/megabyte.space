import { Prospect, ProspectCategory, DonationTier } from './types';

interface RawProspect {
  name: string;
  address_line1: string;
  city: string;
  state: string;
  zip: string;
  category: ProspectCategory;
}

const rawProspects: RawProspect[] = [
  // === CORPORATE / TECHNOLOGY ===
  { name: 'Prudential Financial', address_line1: '751 Broad St', city: 'Newark', state: 'NJ', zip: '07102', category: 'corporate' },
  { name: 'Audible (Amazon)', address_line1: '1 Washington Park', city: 'Newark', state: 'NJ', zip: '07102', category: 'technology' },
  { name: 'Panasonic North America', address_line1: 'Two Riverfront Plaza', city: 'Newark', state: 'NJ', zip: '07102', category: 'corporate' },
  { name: 'Horizon Blue Cross Blue Shield of NJ', address_line1: '3 Penn Plaza East', city: 'Newark', state: 'NJ', zip: '07105', category: 'corporate' },
  { name: 'PSEG', address_line1: '80 Park Plaza', city: 'Newark', state: 'NJ', zip: '07102', category: 'utility' },
  { name: 'Mars Wrigley', address_line1: '110 Edison Pl', city: 'Newark', state: 'NJ', zip: '07102', category: 'corporate' },

  // === UNIVERSITIES ===
  { name: 'Rutgers University Newark', address_line1: '123 Washington St', city: 'Newark', state: 'NJ', zip: '07102', category: 'university' },
  { name: 'NJIT', address_line1: '323 Martin Luther King Blvd', city: 'Newark', state: 'NJ', zip: '07102', category: 'university' },
  { name: 'Essex County College', address_line1: '303 University Ave', city: 'Newark', state: 'NJ', zip: '07102', category: 'university' },
  { name: 'Seton Hall Law School', address_line1: '1109 Raymond Blvd', city: 'Newark', state: 'NJ', zip: '07102', category: 'university' },

  // === HEALTHCARE ===
  { name: 'University Hospital', address_line1: '150 Bergen St', city: 'Newark', state: 'NJ', zip: '07103', category: 'healthcare' },
  { name: 'Newark Beth Israel Medical Center', address_line1: '201 Lyons Ave', city: 'Newark', state: 'NJ', zip: '07112', category: 'healthcare' },
  { name: "Saint Michael's Medical Center", address_line1: '111 Central Ave', city: 'Newark', state: 'NJ', zip: '07102', category: 'healthcare' },

  // === ARTS / CULTURE ===
  { name: 'New Jersey Performing Arts Center', address_line1: '1 Center St', city: 'Newark', state: 'NJ', zip: '07102', category: 'arts' },
  { name: 'Newark Museum of Art', address_line1: '49 Washington St', city: 'Newark', state: 'NJ', zip: '07102', category: 'arts' },
  { name: 'Prudential Center', address_line1: '25 Lafayette St', city: 'Newark', state: 'NJ', zip: '07102', category: 'arts' },

  // === LEGAL ===
  { name: 'Gibbons PC', address_line1: 'One Gateway Center', city: 'Newark', state: 'NJ', zip: '07102', category: 'legal' },
  { name: 'McCarter & English', address_line1: 'Four Gateway Center', city: 'Newark', state: 'NJ', zip: '07102', category: 'legal' },
  { name: 'Lowenstein Sandler', address_line1: 'One Gateway Center', city: 'Newark', state: 'NJ', zip: '07102', category: 'legal' },
  { name: 'Genova Burns', address_line1: '494 Broad St', city: 'Newark', state: 'NJ', zip: '07102', category: 'legal' },
  { name: 'K&L Gates', address_line1: 'One Gateway Center', city: 'Newark', state: 'NJ', zip: '07102', category: 'legal' },

  // === PROFESSIONAL SERVICES ===
  { name: 'Deloitte', address_line1: 'One Gateway Center', city: 'Newark', state: 'NJ', zip: '07102', category: 'professional_services' },
  { name: 'EY', address_line1: 'One Gateway Center', city: 'Newark', state: 'NJ', zip: '07102', category: 'professional_services' },

  // === FINANCIAL ===
  { name: 'Bank of America', address_line1: '575 Broad St', city: 'Newark', state: 'NJ', zip: '07102', category: 'financial' },
  { name: 'PNC Bank', address_line1: 'One Gateway Center', city: 'Newark', state: 'NJ', zip: '07102', category: 'financial' },
  { name: 'TD Bank', address_line1: '100 Mulberry St', city: 'Newark', state: 'NJ', zip: '07102', category: 'financial' },
  { name: 'Wells Fargo', address_line1: '550 Broad St', city: 'Newark', state: 'NJ', zip: '07102', category: 'financial' },
  { name: 'Valley Bank', address_line1: '50 Park Pl', city: 'Newark', state: 'NJ', zip: '07102', category: 'financial' },
  { name: 'Citizens Bank', address_line1: '707 Broad St', city: 'Newark', state: 'NJ', zip: '07102', category: 'financial' },
  { name: 'Provident Bank', address_line1: '830 Broad St', city: 'Newark', state: 'NJ', zip: '07102', category: 'financial' },
  { name: 'Popular Bank', address_line1: '300 Jefferson St', city: 'Newark', state: 'NJ', zip: '07105', category: 'financial' },

  // === HOSPITALITY ===
  { name: 'Robert Treat Hotel', address_line1: '50 Park Pl', city: 'Newark', state: 'NJ', zip: '07102', category: 'hospitality' },
  { name: 'DoubleTree Newark Penn Station', address_line1: '1048 Raymond Blvd', city: 'Newark', state: 'NJ', zip: '07102', category: 'hospitality' },
  { name: 'Courtyard Newark Downtown', address_line1: '858 Broad St', city: 'Newark', state: 'NJ', zip: '07102', category: 'hospitality' },
  { name: 'TRYP by Wyndham Newark Downtown', address_line1: '24 E Park St', city: 'Newark', state: 'NJ', zip: '07102', category: 'hospitality' },

  // === FOUNDATIONS ===
  { name: 'Victoria Foundation', address_line1: '31 Mulberry St', city: 'Newark', state: 'NJ', zip: '07102', category: 'foundation' },
  { name: 'Community Foundation of NJ', address_line1: '35 Knox Hill Rd', city: 'Morristown', state: 'NJ', zip: '07960', category: 'foundation' },
  { name: 'Geraldine Dodge Foundation', address_line1: '14 Maple Ave', city: 'Morristown', state: 'NJ', zip: '07960', category: 'foundation' },

  // === NONPROFITS ===
  { name: 'United Way of Greater Newark', address_line1: '550 Broad St', city: 'Newark', state: 'NJ', zip: '07102', category: 'nonprofit' },
  { name: 'Catholic Charities Newark', address_line1: '590 N 7th St', city: 'Newark', state: 'NJ', zip: '07107', category: 'nonprofit' },
  { name: 'YMCA of Newark', address_line1: '600 Broad St', city: 'Newark', state: 'NJ', zip: '07102', category: 'nonprofit' },
  { name: 'Newark Public Library', address_line1: '5 Washington St', city: 'Newark', state: 'NJ', zip: '07102', category: 'nonprofit' },

  // === CIVIC / GOVERNMENT ===
  { name: 'Newark Downtown District', address_line1: '60 Park Pl', city: 'Newark', state: 'NJ', zip: '07102', category: 'government' },
  { name: 'Newark Alliance', address_line1: '60 Park Pl', city: 'Newark', state: 'NJ', zip: '07102', category: 'nonprofit' },
  { name: 'Invest Newark', address_line1: '111 Mulberry St', city: 'Newark', state: 'NJ', zip: '07102', category: 'government' },
  { name: 'NJ Transit', address_line1: '1 Penn Plaza East', city: 'Newark', state: 'NJ', zip: '07105', category: 'government' },

  // === ADDITIONAL REGIONAL CSR-ACTIVE ORGANIZATIONS (47-150) ===
  { name: 'Cablevision / Altice USA', address_line1: '1 Court Square West', city: 'Long Island City', state: 'NY', zip: '11101', category: 'technology' },
  { name: 'Verizon NJ', address_line1: '540 Broad St', city: 'Newark', state: 'NJ', zip: '07102', category: 'technology' },
  { name: 'IDT Corporation', address_line1: '520 Broad St', city: 'Newark', state: 'NJ', zip: '07102', category: 'technology' },
  { name: 'Goya Foods', address_line1: '350 County Rd', city: 'Jersey City', state: 'NJ', zip: '07307', category: 'food_service' },
  { name: 'Manischewitz Company', address_line1: '80 Ave K', city: 'Newark', state: 'NJ', zip: '07105', category: 'food_service' },
  { name: 'Ironbound Community Corporation', address_line1: '317 Elm St', city: 'Newark', state: 'NJ', zip: '07105', category: 'nonprofit' },
  { name: 'La Casa de Don Pedro', address_line1: '23 Broadway', city: 'Newark', state: 'NJ', zip: '07104', category: 'nonprofit' },
  { name: 'New Community Corporation', address_line1: '233 W Market St', city: 'Newark', state: 'NJ', zip: '07103', category: 'nonprofit' },
  { name: 'Greater Newark Enterprises Corp', address_line1: '60 Park Pl Suite 1800', city: 'Newark', state: 'NJ', zip: '07102', category: 'nonprofit' },
  { name: 'Newark Housing Authority', address_line1: '57 Sussex Ave', city: 'Newark', state: 'NJ', zip: '07103', category: 'government' },
  { name: 'Port Authority of NY & NJ', address_line1: '4 World Trade Center', city: 'New York', state: 'NY', zip: '10007', category: 'government' },
  { name: 'RWJBarnabas Health', address_line1: '95 Old Short Hills Rd', city: 'West Orange', state: 'NJ', zip: '07052', category: 'healthcare' },
  { name: 'Hackensack Meridian Health', address_line1: '343 Thornall St', city: 'Edison', state: 'NJ', zip: '08837', category: 'healthcare' },
  { name: 'Atlantic Health System', address_line1: '475 South St', city: 'Morristown', state: 'NJ', zip: '07960', category: 'healthcare' },
  { name: 'Quest Diagnostics', address_line1: '500 Plaza Dr', city: 'Secaucus', state: 'NJ', zip: '07094', category: 'healthcare' },
  { name: 'BD (Becton Dickinson)', address_line1: '1 Becton Dr', city: 'Franklin Lakes', state: 'NJ', zip: '07417', category: 'healthcare' },
  { name: 'ADP', address_line1: '1 ADP Blvd', city: 'Roseland', state: 'NJ', zip: '07068', category: 'technology' },
  { name: 'Cognizant', address_line1: '211 Quality Circle', city: 'College Station', state: 'NJ', zip: '07666', category: 'technology' },
  { name: 'Broadridge Financial Solutions', address_line1: '5 Dakota Dr', city: 'Lake Success', state: 'NY', zip: '11042', category: 'financial' },
  { name: 'Investors Bank', address_line1: '101 JFK Pkwy', city: 'Short Hills', state: 'NJ', zip: '07078', category: 'financial' },
  { name: 'Columbia Bank', address_line1: '19-01 Rt 208 North', city: 'Fair Lawn', state: 'NJ', zip: '07410', category: 'financial' },
  { name: 'Kearny Financial', address_line1: '120 Passaic Ave', city: 'Fairfield', state: 'NJ', zip: '07004', category: 'financial' },
  { name: 'Northfield Bank', address_line1: '1410 St Georges Ave', city: 'Avenel', state: 'NJ', zip: '07001', category: 'financial' },
  { name: 'Riker Danzig', address_line1: 'One Speedwell Ave', city: 'Morristown', state: 'NJ', zip: '07962', category: 'legal' },
  { name: 'Sills Cummis & Gross', address_line1: 'One Riverfront Plaza', city: 'Newark', state: 'NJ', zip: '07102', category: 'legal' },
  { name: 'Connell Foley', address_line1: '85 Livingston Ave', city: 'Roseland', state: 'NJ', zip: '07068', category: 'legal' },
  { name: 'Chiesa Shahinian & Giantomasi', address_line1: 'One Boland Dr', city: 'West Orange', state: 'NJ', zip: '07052', category: 'legal' },
  { name: 'Day Pitney', address_line1: 'One Jefferson Rd', city: 'Parsippany', state: 'NJ', zip: '07054', category: 'legal' },
  { name: 'Scarinci Hollenbeck', address_line1: '1100 Valley Brook Ave', city: 'Lyndhurst', state: 'NJ', zip: '07071', category: 'legal' },
  { name: 'Lindabury McCormick', address_line1: '53 Cardinal Dr', city: 'Westfield', state: 'NJ', zip: '07090', category: 'legal' },
  { name: 'KPMG', address_line1: '51 JFK Pkwy', city: 'Short Hills', state: 'NJ', zip: '07078', category: 'professional_services' },
  { name: 'PwC', address_line1: '100 Mulberry St', city: 'Newark', state: 'NJ', zip: '07102', category: 'professional_services' },
  { name: 'Grant Thornton', address_line1: '2001 Market St', city: 'Philadelphia', state: 'PA', zip: '19103', category: 'professional_services' },
  { name: 'BDO USA', address_line1: '100 Park Ave', city: 'New York', state: 'NY', zip: '10017', category: 'professional_services' },
  { name: 'WithumSmith+Brown', address_line1: '1 Spring St', city: 'New Brunswick', state: 'NJ', zip: '08901', category: 'professional_services' },
  { name: 'CohnReznick', address_line1: '1301 Ave of the Americas', city: 'New York', state: 'NY', zip: '10019', category: 'professional_services' },
  { name: 'Eisner Advisory Group', address_line1: '733 Third Ave', city: 'New York', state: 'NY', zip: '10017', category: 'professional_services' },
  { name: 'NJ Community Development Corp', address_line1: '77 Hamilton St', city: 'Paterson', state: 'NJ', zip: '07501', category: 'nonprofit' },
  { name: 'Boys & Girls Clubs of Newark', address_line1: '120 Linden Ave', city: 'Newark', state: 'NJ', zip: '07104', category: 'nonprofit' },
  { name: 'Newark Emergency Services for Families', address_line1: '370 S 7th St', city: 'Newark', state: 'NJ', zip: '07103', category: 'nonprofit' },
  { name: 'Covenant House NJ', address_line1: '330 Washington St', city: 'Newark', state: 'NJ', zip: '07102', category: 'nonprofit' },
  { name: 'Habitat for Humanity Newark', address_line1: '96 New St', city: 'Newark', state: 'NJ', zip: '07102', category: 'nonprofit' },
  { name: 'American Red Cross NJ', address_line1: '209 Fairfield Rd', city: 'Fairfield', state: 'NJ', zip: '07004', category: 'nonprofit' },
  { name: 'NJ Institute for Social Justice', address_line1: '60 Park Pl Suite 511', city: 'Newark', state: 'NJ', zip: '07102', category: 'nonprofit' },
  { name: 'Newark Arts', address_line1: '24 Rector St', city: 'Newark', state: 'NJ', zip: '07102', category: 'arts' },
  { name: 'Symphony Hall Newark', address_line1: '1020 Broad St', city: 'Newark', state: 'NJ', zip: '07102', category: 'arts' },
  { name: 'Gateway Project', address_line1: '60 Park Pl', city: 'Newark', state: 'NJ', zip: '07102', category: 'arts' },
  { name: 'Newark Riverfront Revival', address_line1: '60 Park Pl', city: 'Newark', state: 'NJ', zip: '07102', category: 'nonprofit' },
  { name: 'Archdiocese of Newark', address_line1: '171 Clifton Ave', city: 'Newark', state: 'NJ', zip: '07104', category: 'religious' },
  { name: 'Newark LGBTQ Community Center', address_line1: '21 Nelson Pl', city: 'Newark', state: 'NJ', zip: '07102', category: 'nonprofit' },
  { name: 'NJ Lottery', address_line1: '1333 Brunswick Ave Circle', city: 'Trenton', state: 'NJ', zip: '08648', category: 'government' },
  { name: 'Montclair State University', address_line1: '1 Normal Ave', city: 'Montclair', state: 'NJ', zip: '07043', category: 'university' },
  { name: 'Kean University', address_line1: '1000 Morris Ave', city: 'Union', state: 'NJ', zip: '07083', category: 'university' },
  { name: 'Fairleigh Dickinson University', address_line1: '1000 River Rd', city: 'Teaneck', state: 'NJ', zip: '07666', category: 'university' },
  { name: 'Stevens Institute of Technology', address_line1: '1 Castle Point Terrace', city: 'Hoboken', state: 'NJ', zip: '07030', category: 'university' },
  { name: 'Berkeley College', address_line1: '536 Broad St', city: 'Newark', state: 'NJ', zip: '07102', category: 'university' },
  { name: 'Pillar College', address_line1: '60 Park Pl Suite 701', city: 'Newark', state: 'NJ', zip: '07102', category: 'university' },
  { name: 'NJR Home Services', address_line1: '1415 Wyckoff Rd', city: 'Wall', state: 'NJ', zip: '07719', category: 'utility' },
  { name: 'South Jersey Industries', address_line1: '1 S Jersey Plz', city: 'Folsom', state: 'NJ', zip: '08037', category: 'utility' },
  { name: 'Newark Energy', address_line1: '30 Frelinghuysen Ave', city: 'Newark', state: 'NJ', zip: '07114', category: 'utility' },
  { name: 'Hilton Newark Airport', address_line1: '1170 Spring St', city: 'Elizabeth', state: 'NJ', zip: '07201', category: 'hospitality' },
  { name: 'Newark Liberty Intl Airport Marriott', address_line1: '1 Hotel Rd', city: 'Newark', state: 'NJ', zip: '07114', category: 'hospitality' },
  { name: 'Element Harrison Newark', address_line1: '399 Somerset St', city: 'Harrison', state: 'NJ', zip: '07029', category: 'hospitality' },
  { name: 'Hyatt Regency Jersey City', address_line1: '2 Exchange Pl', city: 'Jersey City', state: 'NJ', zip: '07302', category: 'hospitality' },
  { name: 'NJ Economic Development Authority', address_line1: '36 West State St', city: 'Trenton', state: 'NJ', zip: '08625', category: 'government' },
  { name: 'Essex County Government', address_line1: '465 Dr Martin Luther King Jr Blvd', city: 'Newark', state: 'NJ', zip: '07102', category: 'government' },
  { name: 'City of Newark', address_line1: '920 Broad St', city: 'Newark', state: 'NJ', zip: '07102', category: 'government' },
  { name: 'Newark Community Health Centers', address_line1: '741 Broadway', city: 'Newark', state: 'NJ', zip: '07104', category: 'healthcare' },
  { name: 'North Ward Center', address_line1: '346 Mt Prospect Ave', city: 'Newark', state: 'NJ', zip: '07104', category: 'nonprofit' },
  { name: 'Urban League of Essex County', address_line1: '508 Central Ave', city: 'Newark', state: 'NJ', zip: '07107', category: 'nonprofit' },
  { name: 'Big Brothers Big Sisters Essex', address_line1: '64 Prospect St', city: 'Newark', state: 'NJ', zip: '07105', category: 'nonprofit' },
  { name: 'NJ Reentry Corporation', address_line1: '591 Summit Ave', city: 'Jersey City', state: 'NJ', zip: '07306', category: 'nonprofit' },
  { name: 'ShopRite Partners in Caring', address_line1: '176 Passaic Ave', city: 'Kearny', state: 'NJ', zip: '07032', category: 'retail' },
  { name: 'Whole Foods Market Newark', address_line1: '2 Gateway Center', city: 'Newark', state: 'NJ', zip: '07102', category: 'retail' },
  { name: "BJ's Wholesale Club", address_line1: '350 Rt 46', city: 'Fairfield', state: 'NJ', zip: '07004', category: 'retail' },
  { name: 'Stop & Shop NJ', address_line1: '1385 Hancock St', city: 'Quincy', state: 'MA', zip: '02169', category: 'retail' },
  { name: 'Wegmans Food Markets', address_line1: '1500 Brooks Ave', city: 'Rochester', state: 'NY', zip: '14603', category: 'retail' },
  { name: 'RBH Group', address_line1: '44 Whippany Rd', city: 'Morristown', state: 'NJ', zip: '07960', category: 'real_estate' },
  { name: 'Hartz Mountain Industries', address_line1: '400 Plaza Dr', city: 'Secaucus', state: 'NJ', zip: '07094', category: 'real_estate' },
  { name: 'Mack-Cali Realty', address_line1: 'Harborside 3', city: 'Jersey City', state: 'NJ', zip: '07311', category: 'real_estate' },
  { name: 'CBRE NJ', address_line1: '1 Gatehall Dr', city: 'Parsippany', state: 'NJ', zip: '07054', category: 'real_estate' },
  { name: 'Cushman & Wakefield NJ', address_line1: '101 Wood Ave S', city: 'Iselin', state: 'NJ', zip: '08830', category: 'real_estate' },
  { name: 'Prism Capital Partners', address_line1: '400 Frank W Burr Blvd', city: 'Teaneck', state: 'NJ', zip: '07666', category: 'real_estate' },
  { name: 'Edison Properties', address_line1: '2050 Center Ave', city: 'Fort Lee', state: 'NJ', zip: '07024', category: 'real_estate' },
  { name: 'L+M Development Partners', address_line1: '1865 Palmer Ave', city: 'Larchmont', state: 'NY', zip: '10538', category: 'real_estate' },
  { name: 'Dranoff Properties', address_line1: '2101 Market St', city: 'Philadelphia', state: 'PA', zip: '19103', category: 'real_estate' },
  { name: 'J&L Companies', address_line1: '50 Harrison St', city: 'Hoboken', state: 'NJ', zip: '07030', category: 'real_estate' },
  { name: 'National Newark Building', address_line1: '744 Broad St', city: 'Newark', state: 'NJ', zip: '07102', category: 'real_estate' },
  { name: 'Berger Organization', address_line1: '270 Sylvan Ave', city: 'Englewood Cliffs', state: 'NJ', zip: '07632', category: 'real_estate' },
  { name: 'SJP Properties', address_line1: '11 Times Square', city: 'New York', state: 'NY', zip: '10036', category: 'real_estate' },
  { name: 'NAIOP NJ', address_line1: '1 Meadowlands Plaza', city: 'East Rutherford', state: 'NJ', zip: '07073', category: 'real_estate' },
  { name: 'NJ Future', address_line1: '16 W Lafayette St', city: 'Trenton', state: 'NJ', zip: '08608', category: 'nonprofit' },
  { name: 'Fund for New Jersey', address_line1: '94 Church St', city: 'New Brunswick', state: 'NJ', zip: '08901', category: 'foundation' },
  { name: 'Turrell Fund', address_line1: '21 Van Vleck St', city: 'Montclair', state: 'NJ', zip: '07042', category: 'foundation' },
  { name: 'MCJ Amelior Foundation', address_line1: 'PO Box 5062', city: 'Newark', state: 'NJ', zip: '07105', category: 'foundation' },
  { name: 'Prudential Foundation', address_line1: '751 Broad St', city: 'Newark', state: 'NJ', zip: '07102', category: 'foundation' },
  { name: 'Robert Wood Johnson Foundation', address_line1: '50 College Rd East', city: 'Princeton', state: 'NJ', zip: '08540', category: 'foundation' },
  { name: 'Henry E. Niles Foundation', address_line1: '3 East Gate Dr', city: 'Livingston', state: 'NJ', zip: '07039', category: 'foundation' },
  { name: 'Healthcare Foundation of NJ', address_line1: '163 W Hanover St', city: 'Trenton', state: 'NJ', zip: '08618', category: 'foundation' },
  { name: 'Nicholson Foundation', address_line1: '35 Clyde Rd', city: 'Somerset', state: 'NJ', zip: '08873', category: 'foundation' },
  { name: 'Burke Foundation', address_line1: '5 Vaughn Dr', city: 'Princeton', state: 'NJ', zip: '08540', category: 'foundation' },
  { name: 'PSEG Foundation', address_line1: '80 Park Plaza', city: 'Newark', state: 'NJ', zip: '07102', category: 'foundation' },
  { name: 'WBGO Jazz 88.3', address_line1: '54 Park Pl', city: 'Newark', state: 'NJ', zip: '07102', category: 'media' },
  { name: 'NJ Advance Media', address_line1: '30 Journal Sq', city: 'Jersey City', state: 'NJ', zip: '07306', category: 'media' },
  { name: 'TAPinto Newark', address_line1: '60 Park Pl', city: 'Newark', state: 'NJ', zip: '07102', category: 'media' },
  { name: 'Newark Board of Education', address_line1: '765 Broad St', city: 'Newark', state: 'NJ', zip: '07102', category: 'government' },
  { name: 'Port Newark Container Terminal', address_line1: '241 Calcutta St', city: 'Newark', state: 'NJ', zip: '07114', category: 'corporate' },
  { name: 'Maersk Line', address_line1: '185 Hudson St', city: 'Jersey City', state: 'NJ', zip: '07302', category: 'corporate' },
  { name: 'CIT Group', address_line1: '1 CIT Dr', city: 'Livingston', state: 'NJ', zip: '07039', category: 'financial' },
  { name: 'Emigrant Bank', address_line1: '5 E 42nd St', city: 'New York', state: 'NY', zip: '10017', category: 'financial' },
  { name: 'Peapack-Gladstone Financial', address_line1: '500 Hills Dr', city: 'Bedminster', state: 'NJ', zip: '07921', category: 'financial' },
  { name: 'Spencer Savings Bank', address_line1: '611 River Dr', city: 'Elmwood Park', state: 'NJ', zip: '07407', category: 'financial' },
  { name: 'Cross County Savings Bank', address_line1: '233 Broadway', city: 'New York', state: 'NY', zip: '10279', category: 'financial' },
  { name: 'Drinker Biddle & Reath', address_line1: '1 Gateway Center', city: 'Newark', state: 'NJ', zip: '07102', category: 'legal' },
  { name: 'Fox Rothschild', address_line1: '1301 Atlantic Ave', city: 'Atlantic City', state: 'NJ', zip: '08401', category: 'legal' },
  { name: 'Archer & Greiner', address_line1: 'One Centennial Sq', city: 'Haddonfield', state: 'NJ', zip: '08033', category: 'legal' },
];

function categoryToTier(category: ProspectCategory, name: string): DonationTier {
  const anchorNames = [
    'Prudential Financial', 'Audible (Amazon)', 'Panasonic North America',
    'Horizon Blue Cross Blue Shield of NJ', 'PSEG', 'Mars Wrigley',
    'Bank of America', 'Wells Fargo', 'Deloitte', 'EY',
    'Prudential Foundation', 'Robert Wood Johnson Foundation',
  ];
  if (anchorNames.includes(name)) return 'anchor';

  const impactCategories: ProspectCategory[] = ['corporate', 'financial', 'foundation'];
  if (impactCategories.includes(category)) return 'impact';

  const sponsorCategories: ProspectCategory[] = [
    'healthcare', 'legal', 'professional_services', 'university', 'technology', 'utility',
  ];
  if (sponsorCategories.includes(category)) return 'sponsor';

  return 'supporter';
}

function scoreProspect(category: ProspectCategory, tier: DonationTier, city: string): number {
  let score = 50;

  const tierScores: Record<DonationTier, number> = {
    anchor: 40,
    impact: 25,
    sponsor: 15,
    supporter: 5,
  };
  score += tierScores[tier];

  if (city.toLowerCase() === 'newark') score += 10;

  const csrCategories: ProspectCategory[] = ['foundation', 'corporate', 'financial'];
  if (csrCategories.includes(category)) score += 5;

  return Math.min(score, 100);
}

export function getProspects(): Prospect[] {
  return rawProspects.map((raw, index) => {
    const tier = categoryToTier(raw.category, raw.name);
    const score = scoreProspect(raw.category, tier, raw.city);
    return {
      id: index + 1,
      name: raw.name,
      address: {
        address_line1: raw.address_line1,
        address_city: raw.city,
        address_state: raw.state,
        address_zip: raw.zip,
      },
      category: raw.category,
      tier,
      score,
    };
  });
}

export function getRankedProspects(): Prospect[] {
  return getProspects().sort((a, b) => b.score - a.score);
}

export function getProspectsByTier(tier: DonationTier): Prospect[] {
  return getRankedProspects().filter((p) => p.tier === tier);
}

export function getProspectCount(): number {
  return rawProspects.length;
}
