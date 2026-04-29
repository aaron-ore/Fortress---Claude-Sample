// This utility will now be used for structuring folder names if desired,
// but the primary "location" of an item will be its folderId.
// Keeping it for potential future use in structuring folder names or sub-locations.

export interface LocationParts {
  area: string;
  row: string;
  bay: string;
  level: string;
  pos: string;
}

/**
 * Parses a location string (e.g., "A-01-01-1-A") into its individual components.
 * Returns default placeholders if a part is missing or empty.
 */
export const parseLocationString = (location: string): LocationParts => {
  const parts = location.split('-');
  return {
    area: parts[0] || 'N/A',
    row: parts[1] || 'N/A',
    bay: parts[2] || 'N/A',
    level: parts[3] || 'N/A',
    pos: parts[4] || 'N/A',
  };
};

/**
 * Builds a location string (e.g., "A-01-01-1-A") from its individual components.
 * It will always produce a full string, using 'N/A' for any parts that are empty or 'N/A'.
 */
export const buildLocationString = (parts: LocationParts): string => {
  const area = parts.area || 'N/A';
  const row = parts.row || 'N/A';
  const bay = parts.bay || 'N/A';
  const level = parts.level || 'N/A';
  const pos = parts.pos || 'N/A';
  return `${area}-${row}-${bay}-${level}-${pos}`;
};

/**
 * Extracts unique values for a specific part (area, row, bay, level, pos)
 * from a list of full location strings.
 */
export const getUniqueLocationParts = (locations: string[], part: keyof LocationParts): string[] => {
  const uniqueValues = new Set<string>();
  locations.forEach(location => {
    const parsed = parseLocationString(location);
    if (parsed[part] && parsed[part] !== 'N/A') { // Exclude 'N/A' from unique options
      uniqueValues.add(parsed[part]);
    }
  });
  return Array.from(uniqueValues).sort();
};