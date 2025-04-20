import { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
// processCsvData and createTestTimeline are no longer needed here directly
// import { processCsvData, createTestTimeline } from "./timelineUtils";

/**
 * Custom hook to fetch and parse timeline data from a local CSV file.
 * It returns the raw parsed data and unique groups found.
 * @param {string} csvUrl - The URL or path to the local CSV file.
 * @returns {{ rawCsvData: Array<object> | null, uniqueGroups: Array<string>, isLoading: boolean, error: string | null }}
 */
const useTimelineData = (csvUrl) => {
  const [rawCsvData, setRawCsvData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component
    setRawCsvData(null); // Reset data on new fetch
    setIsLoading(true);
    setError(null); // Reset error on new fetch

    fetch(csvUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then((csvText) => {
        if (!isMounted) return; // Don't proceed if component unmounted

        Papa.parse(csvText, {
          header: true,
          delimiter: "|", // Specify pipe delimiter
          skipEmptyLines: true,
          complete: (results) => {
            if (!isMounted) return;
            // Store the raw parsed data
            setRawCsvData(results.data || []); // Ensure it's an array even if empty/error
            setIsLoading(false);
          },
          error: (parseError) => {
            if (!isMounted) return;
            console.error("CSV parsing error:", parseError);
            setError("Error parsing CSV: " + parseError.message);
            setRawCsvData([]); // Set empty array on parse error
            setIsLoading(false);
          },
        });
      })
      .catch((fetchError) => {
        if (!isMounted) return;
        console.error("CSV loading error:", fetchError);
        setError("Error loading CSV file: " + fetchError.message);
        setRawCsvData([]); // Set empty array on fetch error
        setIsLoading(false);
      });

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [csvUrl]); // Re-run effect if csvUrl changes

  // Calculate unique groups using useMemo for efficiency
  const uniqueGroups = useMemo(() => {
    if (!rawCsvData) return [];
    const groups = new Set();
    rawCsvData.forEach(row => {
      if (row.Group && row.Group.trim() !== "") {
        groups.add(row.Group.trim());
      }
    });
    return Array.from(groups).sort(); // Return sorted array of unique groups
  }, [rawCsvData]);

  return { rawCsvData, uniqueGroups, isLoading, error };
};

export default useTimelineData;
