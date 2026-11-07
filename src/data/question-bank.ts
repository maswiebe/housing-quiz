export const FULL_QUESTIONNAIRE_VERSION = 'v5-draft-2026-10-29';
export const ANSWER_IDS = ['allow_more', 'require_feature'] as const;
export type AnswerId = typeof ANSWER_IDS[number];
export type CategoryId = 'neighborhood' | 'housing_standards' | 'affordability';
export type VisualKind = 'tree' | 'front-gardens' | 'height' | 'stepback' | 'side-gaps' | 'rear-garden' | 'privacy' | 'shadow' | 'private-view' | 'public-view' | 'heritage' | 'parking' | 'storage' | 'terraces' | 'studio' | 'windows' | 'stairs' | 'affordable-count' | 'affordable-depth' | 'relocation';

export const CATEGORY_DEFINITIONS: { id: CategoryId; label: string; shortLabel: string; denominator: number }[] = [
  { id: 'neighborhood', label: 'Neighborhood appearance and nearby amenities', shortLabel: 'The neighborhood', denominator: 12 },
  { id: 'housing_standards', label: 'Requirements for the new homes', shortLabel: 'Inside the homes', denominator: 5 },
  { id: 'affordability', label: 'Affordability and existing residents', shortLabel: 'The people', denominator: 3 },
];

export interface Option {
  netAdditionalHomes: number;
  totalCompletedHomes: number;
  headline: string;
  details: string[];
  action: string;
  visualDescription: string;
  visualVariant: 'more' | 'feature';
  // Ground floor first. Full apartment floors have four homes; reduced floors are explicit.
  homesByFloor?: number[];
  bedroomsPerHome?: number;
  retainedHomes?: number;
  marketHomes?: number;
  restrictedHomes?: number;
  restrictedRentPercent?: number;
}
export interface Question {
  id: string;
  ordinal: number;
  category: CategoryId;
  title: string;
  context: string;
  policyQuestion: string;
  comparisonMetric: 'homes' | 'bedrooms';
  existingHomes: number;
  existingHomesByFloor: number[];
  options: Record<AnswerId, Option>;
  visualKind: VisualKind;
  sharedSceneId: string;
  assumptions: string[];
  status: 'Illustrative scenario';
}

export const GENERAL_ASSUMPTION = 'Take the stated tradeoff as given for this hypothetical site. Other relevant features, including bedroom mix, apartment size, tenure, and public subsidy, are held the same unless explicitly varied. These illustrations are not assessments of specific development proposals.';
const AFFORDABILITY_ASSUMPTION = 'Both designs have the same public subsidy, income-eligibility rules, and 60-year affordability duration. Restricted rents use the same initial market-rent benchmark and subsequently follow the same inflation index. These are hypothetical assumptions, not feasibility findings.';

function option(homes: number, headline: string, details: string[], action: string, visualDescription: string, extra: Partial<Option> = {}): Option {
  return { netAdditionalHomes: homes, totalCompletedHomes: homes, headline, details, action, visualDescription, visualVariant: 'more', ...extra };
}
function question(ordinal: number, title: string, visualKind: VisualKind, context: string, more: Option, feature: Option, assumptions: string[] = [], existingHomesByFloor: number[] = [], comparisonMetric: Question['comparisonMetric'] = 'homes'): Question {
  const id = `q${String(ordinal).padStart(2, '0')}`;
  return {
    id, ordinal, title, context, visualKind, existingHomesByFloor, comparisonMetric,
    existingHomes: existingHomesByFloor.reduce((sum, homes) => sum + homes, 0), sharedSceneId: `${id}-matched-site`,
    category: ordinal <= 12 ? 'neighborhood' : ordinal <= 17 ? 'housing_standards' : 'affordability',
    policyQuestion: comparisonMetric === 'bedrooms'
      ? 'The owner proposes two-bedroom homes with one exit stair. Should the city allow the proposal or require two stairs and one-bedroom homes?'
      : 'The owner proposes more homes. Should the city allow the proposal or require the alternative?',
    options: { allow_more: { ...more, visualVariant: 'more' }, require_feature: { ...feature, visualVariant: 'feature' } },
    assumptions, status: 'Illustrative scenario',
  };
}

export const QUESTION_BANK: Question[] = [
  question(1, 'A mature tree', 'tree',
    'Six townhomes could fit on this parcel. Keeping its mature tree and leaving room around the roots and canopy reduces that to three.',
    option(6, 'Replacement planting', ["Six townhomes. Replace one mature tree and plant three young trees."], 'Allow 6 homes with replacement planting', 'Site plan: two rows of three townhomes, the original tree location marked, and three small replacement trees.'),
    option(3, 'Keep the mature tree', ["Three townhomes. Retain the mature tree and leave room around it."], 'Require tree preservation, allowing 3 homes', 'The same parcel: one row of three townhomes leaves room for the mature tree at its original location.')),
  question(2, 'Room for front gardens', 'front-gardens',
    'Two adjacent parcels could each fit five townhomes. Matching the neighbors’ deep front gardens would leave room for three per parcel.',
    option(10, 'Shallow front gardens', ["Five townhomes per parcel, with shallow front gardens."], 'Allow 10 homes with shallow front gardens', 'Site plan: two adjacent parcels, each with a row of five townhomes extending toward the street.'),
    option(6, 'Deeper front gardens', ["Three townhomes per parcel, with deeper front gardens."], 'Require deeper gardens, allowing 6 homes', 'The same two parcels: three townhomes on each, set back to match the neighbors’ deep front gardens.')),
  question(3, 'How high to build?', 'height',
    'A proposal adds a six-storey building to a street with shorter buildings. A four-storey alternative is closer to the surrounding heights.',
    option(24, 'Six storeys', ["Six storeys, taller than the neighboring buildings."], 'Allow 24 homes in six storeys', 'Street elevation: a six-storey building with four homes per floor stands between two shorter neighbors.', { homesByFloor: [4, 4, 4, 4, 4, 4] }),
    option(16, 'Four storeys', ["Four storeys, closer to the surrounding heights."], 'Require four storeys, allowing 16 homes', 'The identical street elevation with a four-storey building and four homes per floor; the neighbors are unchanged.', { homesByFloor: [4, 4, 4, 4] })),
  question(4, 'A step back at the top', 'stepback',
    'A five-storey building could have four homes on every floor. Deep setbacks on the top two floors would leave one home on each of those floors.',
    option(20, 'An aligned façade', ["Five full floors with four homes each."], 'Allow 20 homes with an aligned façade', 'Oblique view: five full floors align at the street-facing façade, with four homes per floor.', { homesByFloor: [4, 4, 4, 4, 4] }),
    option(14, 'Recessed upper floors', ["Three full floors, then two deeply recessed floors with one home each."], 'Require upper-floor setbacks, allowing 14 homes', 'The same five-storey building: the top two floors are deeply recessed, leaving one home on each and four on each lower floor.', { homesByFloor: [4, 4, 4, 1, 1] })),
  question(5, 'The space in between', 'side-gaps',
    'Five attached townhomes could use most of the parcel’s width. Wider side setbacks would leave room for a duplex.',
    option(5, 'Narrower side gaps', ["Five townhomes with narrower gaps beside the neighbors."], 'Allow 5 homes with narrower side gaps', 'Site plan with identical lot boundaries: five attached townhomes leave narrow side gaps.'),
    option(2, 'Wider side gaps', ["A duplex with wider gaps on both sides."], 'Require wider side gaps, allowing 2 homes', 'The same parcel with two attached homes and clearly wider gaps on both sides.')),
  question(6, 'A little more backyard', 'rear-garden',
    'Four townhomes could occupy the front and rear of the parcel. A duplex at the front would leave a broad, continuous rear garden.',
    option(4, 'A smaller rear garden', ["Four townhomes with a smaller rear garden."], 'Allow 4 homes with a smaller rear garden', 'Site plan: two rows of two townhomes, leaving a small green garden at the rear.'),
    option(2, 'A broad rear garden', ["A duplex with a broad, continuous rear garden."], 'Require a broad rear garden, allowing 2 homes', 'The same parcel with a two-home duplex at the front and a broad continuous rear garden.')),
  question(7, 'A question of privacy', 'privacy',
    'A four-storey building would overlook neighboring gardens. A three-storey alternative would reduce overlooking from the upper floors.',
    option(16, 'Four storeys', ["Four storeys, with upper-floor windows overlooking neighboring gardens."], 'Allow 16 homes in four storeys with more overlooking', 'Side view: a four-storey building overlooks a neighboring garden, with dashed sight lines from upper windows.', { homesByFloor: [4, 4, 4, 4] }),
    option(12, 'Three storeys', ["Three storeys, reducing overlooking from upper-floor windows."], 'Require three storeys, allowing 12 homes with less overlooking', 'The same side view: a three-storey building beside the unchanged garden, with fewer sight lines.', { homesByFloor: [4, 4, 4] })),
  question(8, 'Winter afternoon sunlight', 'shadow',
    'On an illustrative winter day, 21 December, the proposal adds one hour of afternoon shade to a neighboring garden.',
    option(16, 'One extra hour of shade', ["One additional hour of afternoon shade on 21 December."], 'Allow 16 homes with the additional shade', 'Schematic oblique view: a four-storey building casts an additional shaded area over the neighboring garden.', { homesByFloor: [4, 4, 4, 4] }),
    option(12, 'Avoid the extra shade', ["A three-storey building avoids that additional hour of shade."], 'Require avoiding the extra shade, allowing 12 homes', 'The same schematic garden and sun direction: a three-storey building avoids the additional shaded area.', { homesByFloor: [4, 4, 4] }),
    ['The shadow diagrams are schematic, not a solar simulation. The stated hour is an illustrative premise for 21 December, not a measured result.']),
  question(9, 'A view from home', 'private-view',
    'Several existing homes have a mountain view. The proposal would partially obstruct it; a smaller design would preserve it.',
    option(24, 'Partly obstruct the view', ["Mountain views from several existing homes are partly blocked."], 'Allow 24 homes with partially obstructed private views', 'View from an existing home: the proposed building partially blocks an identical mountain outline.', { homesByFloor: [4, 4, 4, 4, 4, 4] }),
    option(8, 'Preserve private views', ["Preserve the existing mountain views from those homes."], 'Require preserving private views, allowing 8 homes', 'The exact same viewpoint and mountain outline with a lower building preserving the mountain view.', { homesByFloor: [4, 4] })),
  question(10, 'A view we share', 'public-view',
    'A public viewpoint looks toward the mountains. The proposal would partially obstruct that view; a revised design would preserve it.',
    option(24, 'Partly obstruct the view', ["The mountain view from the public viewpoint is partly blocked."], 'Allow 24 homes with a partially obstructed public view', 'View from a public overlook with a bench and railing: the building partially blocks the mountains.', { homesByFloor: [4, 4, 4, 4, 4, 4] }),
    option(12, 'Preserve the public view', ["Preserve the mountain view from the public viewpoint."], 'Require preserving the public view, allowing 12 homes', 'The identical public overlook, bench, railing, and mountain outline, with a lower building preserving the view.', { homesByFloor: [4, 4, 4] })),
  question(11, 'An older street façade', 'heritage',
    'A vacant older nonresidential building occupies the site. Its street-facing façade could be replaced or incorporated into the new building.',
    option(20, 'A new street façade', ["Replace the vacant older nonresidential building with a new façade."], 'Allow 20 homes with a new façade', 'Street elevation: a new building replaces the older façade on the same lot.', { homesByFloor: [4, 4, 4, 4, 4] }),
    option(16, 'Retain the historic façade', ["Retain the historic street-facing façade within a four-storey building."], 'Require façade retention, allowing 16 homes', 'Matched street elevation: the older brick façade is retained within a four-storey building; all floors align with no upper-floor setback.', { homesByFloor: [4, 4, 4, 4] }),
    ['The existing building is vacant and nonresidential. There are no existing homes on this site.']),
  question(12, 'Space for parking', 'parking',
    'On this site, providing more on-site parking leaves less room for housing.',
    option(16, 'Four parking spaces', ["Four on-site parking spaces."], 'Allow 16 homes with four parking spaces', 'Site plan with a larger building and exactly four marked parking spaces.', { homesByFloor: [4, 4, 4, 4] }),
    option(12, 'Twelve parking spaces', ["Twelve on-site parking spaces."], 'Require 12 parking spaces, allowing 12 homes', 'The same site plan with a smaller building footprint, three homes on each of four floors, and exactly twelve marked parking spaces.', { homesByFloor: [3, 3, 3, 3] }),
    ['This scenario does not specify car ownership or effects on street parking.']),
  question(13, 'Some extra storage', 'storage',
    'All proposed homes have ordinary closets. Adding large storage lockers elsewhere in the building reduces the number of homes by one.',
    option(20, 'Ordinary closets', ["Ordinary closets in each home."], 'Allow 20 homes with ordinary closets', 'Simplified floor layout with ordinary closets in the apartments and another apartment in the lower-right area.', { homesByFloor: [4, 4, 4, 4, 4] }),
    option(19, 'Closets and storage lockers', ["Ordinary closets plus large storage lockers."], 'Require large storage lockers, allowing 19 homes', 'Matched layout: the lower-right apartment area becomes a bank of large storage lockers.', { homesByFloor: [3, 4, 4, 4, 4] })),
  question(14, 'A place outside', 'terraces',
    'Each new home could have a small balcony, or the design could provide larger private terraces and fewer homes.',
    option(20, 'Small balconies', ["A small balcony for each home."], 'Allow 20 homes with small balconies', 'Oblique building view with shallow projecting balconies.', { homesByFloor: [4, 4, 4, 4, 4] }),
    option(14, 'Larger private terraces', ["A larger private terrace for each home."], 'Require larger private terraces, allowing 14 homes', 'The matched building view with generous terraces cut into a stepped building shape.', { homesByFloor: [4, 4, 3, 2, 1] })),
  question(15, 'How much space inside?', 'studio',
    'The site provides 5,160 sq ft of apartment interiors. That space could become more smaller studios or fewer larger studios.',
    option(12, '430 sq ft studios', ["Studios averaging 430 sq ft, with 5,160 sq ft of apartment interiors in total."], 'Allow 12 studios averaging 430 sq ft', 'Representative studio floor plan drawn to the same scale as the alternative: 430 square feet with sleeping, kitchen, and bathroom areas.', { homesByFloor: [4, 4, 4] }),
    option(8, '645 sq ft studios', ["Studios averaging 645 sq ft, with 5,160 sq ft of apartment interiors in total."], 'Require larger studios, allowing 8 homes', 'Representative studio floor plan at the identical scale: 645 square feet with a larger living area.', { homesByFloor: [3, 3, 2] }),
    ['Apartment size deliberately differs here. The 5,160 sq ft is the sum of apartment interiors, not a verified equal gross floor area including circulation and services. Floor plans are representative schematics.']),
  question(16, 'Windows on two sides', 'windows',
    'Some apartments in the proposal have windows on one side. Replacing a central apartment on each floor with an open court leaves every remaining home with windows on two sides.',
    option(16, 'Some single-aspect homes', ["Some apartments have exterior windows on only one side."], 'Allow 16 homes with some single-aspect apartments', 'Simplified common-floor plan with four apartments around a corridor; the central apartment has exterior windows on only one side.', { homesByFloor: [4, 4, 4, 4] }),
    option(12, 'All dual-aspect homes', ["Every apartment has exterior windows on two sides."], 'Require windows on two sides, allowing 12 homes', 'Matched schematic plan: an open court replaces the central apartment, leaving three homes, each reaching a corner and having exterior windows on two sides.', { homesByFloor: [3, 3, 3, 3] })),
  question(17, 'One exit stair or two?', 'stairs',
    'Single-stair apartments are common in Europe and parts of Asia. Both designs here provide 12 homes over three storeys. One central stair leaves room for two bedrooms per home; two stairs and a corridor leave room for one.',
    option(12, 'One central exit stair', ["Four two-bedroom homes per floor around a central stair, each with windows on two sides."], 'Allow 12 two-bedroom homes with one central exit stair', 'Schematic floor plan: four corner apartments, each with two bedrooms and windows on two sides, wrap around one central stair and a small shared landing.', { homesByFloor: [4, 4, 4], bedroomsPerHome: 2 }),
    option(12, 'Two exit stairs', ["Four one-bedroom homes per floor along a double-loaded corridor, with apartments on both sides and a stair at each end."], 'Require two exit stairs, allowing 12 one-bedroom homes', 'Matched schematic floor plan: four one-bedroom apartments, two on each side of a central corridor, with an enclosed exit stair at each end.', { homesByFloor: [4, 4, 4], bedroomsPerHome: 1 }),
    ['Both hypothetical designs assume sprinklers, alarms, smoke control, and protected exit stairs. These schematics do not establish compliance with current law or equal fire risk. Bedroom count and apartment size vary in this scenario: the designs provide 24 versus 12 bedrooms in the same 12 homes. The two-bedroom choice counts toward housing supply as bedroom capacity.'], [], 'bedrooms'),
  question(18, 'More income-restricted homes', 'affordable-count',
    'A six-storey proposal provides 24 homes, including four income-restricted homes. A four-storey alternative provides 16, including one. Restricted rents are 80% of the same market-rent benchmark in both.',
    option(24, '4 income-restricted homes', ["Six storeys: 20 market-rate homes and 4 income-restricted homes, with restricted rents at 80% of the benchmark."], 'Allow 24 homes, including 4 income-restricted homes at 80% rents', 'Composition diagram: six rows of four squares, with 20 market-rate and 4 income-restricted homes; restricted rents are 80% of the benchmark.', { marketHomes: 20, restrictedHomes: 4, restrictedRentPercent: 80, homesByFloor: [4, 4, 4, 4, 4, 4] }),
    option(16, '1 income-restricted home', ["Four storeys: 15 market-rate homes and 1 income-restricted home, with restricted rent at 80% of the same benchmark."], 'Require four storeys with 16 homes, including 1 income-restricted home at 80% rent', 'Matched composition diagram: four rows of four squares, with 15 market-rate homes and 1 income-restricted home; restricted rent is 80% of the same benchmark.', { marketHomes: 15, restrictedHomes: 1, restrictedRentPercent: 80, homesByFloor: [4, 4, 4, 4] }),
    [AFFORDABILITY_ASSUMPTION, 'Income-restricted homes are included in each total, not added to it.']),
  question(19, 'A deeper rent discount', 'affordable-depth',
    'The 24-home proposal includes two income-restricted homes at 50% of the market-rent benchmark. A 16-home alternative includes one at 80% of the same benchmark.',
    option(24, '2 restricted homes at 50%', ["Six storeys: 22 market-rate homes and 2 income-restricted homes, with restricted rents at 50% of the benchmark."], 'Allow 24 homes, including 2 income-restricted homes at 50% rents', 'Composition diagram: six rows of four squares, with 22 market-rate and 2 income-restricted homes; restricted rents are 50% of the benchmark.', { marketHomes: 22, restrictedHomes: 2, restrictedRentPercent: 50, homesByFloor: [4, 4, 4, 4, 4, 4] }),
    option(16, '1 restricted home at 80%', ["Four storeys: 15 market-rate homes and 1 income-restricted home, with restricted rent at 80% of the same benchmark."], 'Require four storeys with 16 homes, including 1 income-restricted home at 80% rent', 'Matched composition diagram: four rows of four squares, with 15 market-rate homes and 1 income-restricted home; restricted rent is 80% of the same benchmark.', { marketHomes: 15, restrictedHomes: 1, restrictedRentPercent: 80, homesByFloor: [4, 4, 4, 4] }),
    [AFFORDABILITY_ASSUMPTION, 'Both rent percentages refer to the same benchmark. Income-restricted homes are included in each total.']),
  question(20, 'Staying through construction', 'relocation',
    'Two homes are already occupied on this site. Keeping them allows four homes in total. Replacing them allows eight, with temporary relocation for the existing residents.',
    option(6, 'Temporary relocation', ["Replace the 2 existing homes with 8. Two households move temporarily with funded relocation and a right to return at their existing inflation-adjusted rent."], 'Allow 6 net additional homes with temporary relocation', 'Before and after diagram: two existing homes are replaced by a centered four-storey apartment building with eight homes, two per floor.', { totalCompletedHomes: 8, homesByFloor: [2, 2, 2, 2] }),
    option(2, 'Residents stay throughout', ["Retain the 2 existing homes and add 2, for 4 in total. Existing households stay throughout construction."], 'Require residents to stay, allowing 2 net additional homes', 'Matched before and after diagram: the existing two-home building stays in the same position on the left of the parcel, with a new two-home building added on the right, giving four completed homes.', { totalCompletedHomes: 4, retainedHomes: 2, homesByFloor: [2] }),
    ['Headline counts are net additional homes: 8 − 2 = 6, or 4 − 2 = 2. Funded relocation and a right to return do not eliminate the disruption of moving.'], [2]),
];
