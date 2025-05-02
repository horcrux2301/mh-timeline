import React, { useEffect, useRef, useState, useMemo } from "react";
import Select from "react-select";
import useTimelineData from "./useTimelineData";
import { processCsvData } from "./timelineUtils";
import "./timeline.css";
import {
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Typography,
} from "@mui/material";
import { FilterList, CheckCircle, Cancel } from "@mui/icons-material";

// Import the CSV file URLs (Vite/Webpack specific)
import modernHistoryUrl from "./mh.csv?url";
import ancientHistoryUrl from "./ah.csv?url";

// TimelineJS options based on timeline type
const getTimelineOptions = (timelineType) => ({
  start_at_end: false,
  default_bg_color: "#ffffff",
  timenav_height: 150,
  scale_factor: timelineType === "ancient" ? 2 : 2,
  initial_zoom: timelineType === "ancient" ? 4 : 4,
  zoom_sequence: [0.5, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
  duration: 1000,
});

const TimelineComponent = () => {
  // Initialize selectedTimelineType from localStorage or default to "modern"
  const [selectedTimelineType, setSelectedTimelineType] = useState(() => {
    const savedType = localStorage.getItem("selectedTimelineType");
    return savedType || "modern"; // Use saved value or default to "modern"
  });
  // Save selectedTimelineType to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("selectedTimelineType", selectedTimelineType);
  }, [selectedTimelineType]);

  const csvUrl =
    selectedTimelineType === "modern" ? modernHistoryUrl : ancientHistoryUrl;

  const { rawCsvData, uniqueGroups, isLoading, error } =
    useTimelineData(csvUrl);

  // Initialize active groups with separate storage for each timeline type
  const [activeGroups, setActiveGroups] = useState(() => {
    try {
      // Try to load saved groups for the current timeline type
      const savedGroups = localStorage.getItem(
        `activeGroups_${selectedTimelineType}`
      );
      if (savedGroups) {
        return new Set(JSON.parse(savedGroups));
      }
      return new Set(); // Default to empty set if nothing saved
    } catch (e) {
      console.error("Error loading active groups from localStorage:", e);
      return new Set();
    }
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const timelineContainer = useRef(null);
  const timelineInstance = useRef(null);

  // Save active groups to localStorage when they change
  useEffect(() => {
    try {
      if (activeGroups.size > 0) {
        localStorage.setItem(
          `activeGroups_${selectedTimelineType}`,
          JSON.stringify(Array.from(activeGroups))
        );
      }
    } catch (e) {
      console.error("Error saving active groups to localStorage:", e);
    }
  }, [activeGroups, selectedTimelineType]);

  // Initialize active groups when uniqueGroups are loaded or timeline type changes
  useEffect(() => {
    if (uniqueGroups.length > 0) {
      // Check if we have saved groups for this timeline type
      try {
        const savedGroups = localStorage.getItem(
          `activeGroups_${selectedTimelineType}`
        );
        if (savedGroups) {
          const parsedGroups = JSON.parse(savedGroups);
          // Filter out any saved groups that no longer exist in the current data
          const validGroups = parsedGroups.filter((group) =>
            uniqueGroups.includes(group)
          );
          if (validGroups.length > 0) {
            setActiveGroups(new Set(validGroups));
            return;
          }
        }
      } catch (e) {
        console.error("Error processing saved groups:", e);
      }

      // If no valid saved groups, default to all groups active
      setActiveGroups(new Set(uniqueGroups));
    }
  }, [uniqueGroups, selectedTimelineType]);

  // Create search options from raw data with unique IDs matching timeline events
  const searchOptions = useMemo(() => {
    if (!rawCsvData) return [];
    return rawCsvData
      .map((event) => {
        const uniqueId = `event-${event.Year}-${event.Headline?.replace(
          /\s+/g,
          "-"
        )}`;
        // Show a snippet of the text in the label for context
        const textSnippet = event.Text
          ? `: ${event.Text.slice(0, 60)}${event.Text.length > 60 ? "..." : ""}`
          : "";
        return {
          value: uniqueId,
          label: `${event.Year} - ${event.Headline || ""}${textSnippet}`,
          year: event.Year,
          headline: event.Headline,
          text: event.Text || "",
          uniqueId: uniqueId,
        };
      })
      .sort((a, b) => a.year - b.year);
  }, [rawCsvData]);

  // Filter and process timeline data based on active groups
  const timelineData = useMemo(() => {
    if (!rawCsvData) return null;

    // Filter events by active groups
    const filteredData = rawCsvData.filter((event) =>
      activeGroups.has(event.Group?.trim() || "")
    );

    // If no events match the filter, return null to show message
    if (filteredData.length === 0) return null;

    // Process the filtered data
    const { timelineJson, error: processingError } =
      processCsvData(filteredData);
    if (processingError) {
      console.error("Error processing filtered data:", processingError);
      return null;
    }
    return timelineJson;
  }, [rawCsvData, activeGroups]);

  // Effect to initialize or update TimelineJS
  useEffect(() => {
    if (window.TL && timelineData && timelineContainer.current) {
      if (timelineInstance.current) {
        timelineContainer.current.innerHTML = "";
        timelineInstance.current = null;
      }

      try {
        timelineInstance.current = new window.TL.Timeline(
          timelineContainer.current,
          timelineData,
          getTimelineOptions(selectedTimelineType)
        );
      } catch (initError) {
        console.error("Timeline initialization error:", initError);
      }
    }
  }, [timelineData]);

  // Effect to load TimelineJS assets
  useEffect(() => {
    if (!window.TL) {
      const script = document.createElement("script");
      script.src =
        "https://cdn.knightlab.com/libs/timeline3/latest/js/timeline.js";
      script.async = true;
      document.body.appendChild(script);

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href =
        "https://cdn.knightlab.com/libs/timeline3/latest/css/timeline.css";
      document.head.appendChild(link);
    }
  }, []);

  // Handle group toggle
  const handleGroupToggle = (group) => {
    setActiveGroups((prev) => {
      const newGroups = new Set(prev);
      if (newGroups.has(group)) {
        newGroups.delete(group);
      } else {
        newGroups.add(group);
      }
      return newGroups;
    });
  };

  // Handle select/unselect all groups
  const handleSelectAllGroups = () => {
    setActiveGroups(new Set(uniqueGroups));
  };

  const handleUnselectAllGroups = () => {
    setActiveGroups(new Set());
  };

  // Handle event selection with direct ID matching
  const handleEventSelect = (option) => {
    setSelectedEvent(option);
    if (timelineInstance.current && option) {
      // Use a small delay to ensure the timeline is ready
      setTimeout(() => {
        try {
          timelineInstance.current.goToId(option.uniqueId);
          // Clear search after a longer delay to ensure scroll completes
          setTimeout(() => {
            setSelectedEvent(null);
          }, 1500);
        } catch (err) {
          console.error("Error scrolling to event:", err);
          // Fallback: try to find the event by matching year and headline
          const event = timelineData.events.find(
            (e) =>
              e.text.headline === option.headline &&
              e.start_date.year === parseInt(option.year)
          );
          if (event) {
            timelineInstance.current.goToId(event.unique_id);
            // Clear search after a longer delay to ensure scroll completes
            setTimeout(() => {
              setSelectedEvent(null);
            }, 1500);
          }
        }
      }, 100);
    }
  };

  return (
    <div className="timeline-wrapper">
      <div className="timeline-controls">
        <div className="top-controls">
          <div className="timeline-type-selector">
            <Select
              value={{
                value: selectedTimelineType,
                label:
                  selectedTimelineType === "modern"
                    ? "Modern History"
                    : "Ancient History",
              }}
              onChange={(option) => setSelectedTimelineType(option.value)}
              options={[
                { value: "modern", label: "Modern History" },
                { value: "ancient", label: "Ancient History" },
              ]}
              styles={{
                control: (base) => ({
                  ...base,
                  minWidth: "200px",
                  backgroundColor: "#f8fafc",
                  borderColor: "#e2e8f0",
                  boxShadow: "none",
                  "&:hover": {
                    borderColor: "#94a3b8",
                  },
                }),
                menu: (base) => ({
                  ...base,
                  zIndex: 9999,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  overflow: "hidden",
                }),
              }}
            />
          </div>
          <div className="search-container">
            <Select
              value={selectedEvent}
              onChange={handleEventSelect}
              options={searchOptions}
              isDisabled={isLoading}
              placeholder="Search events..."
              isClearable
              className="event-search"
              filterOption={(option, input) => {
                // Custom filter: match headline or text (case-insensitive)
                const label = option.label?.toLowerCase() || "";
                const headline = option.data.headline?.toLowerCase() || "";
                const text = option.data.text?.toLowerCase() || "";
                const inputValue = input.toLowerCase();
                return (
                  label.includes(inputValue) ||
                  headline.includes(inputValue) ||
                  text.includes(inputValue)
                );
              }}
              formatOptionLabel={(option) => (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      color: "#1e293b",
                      fontSize: "1rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      minWidth: 0,
                    }}
                  >
                    {option.year} - {option.headline}
                  </span>
                  {option.text && (
                    <span
                      style={{
                        color: "#64748b",
                        fontSize: "0.92rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: 0,
                        marginTop: 2,
                      }}
                    >
                      {option.text}
                    </span>
                  )}
                </div>
              )}
              styles={{
                control: (base) => ({
                  ...base,
                  minWidth: "300px",
                  backgroundColor: "#f8fafc",
                  borderColor: "#e2e8f0",
                  boxShadow: "none",
                  "&:hover": {
                    borderColor: "#94a3b8",
                  },
                }),
                menu: (base) => ({
                  ...base,
                  zIndex: 9999,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  overflow: "hidden",
                }),
                option: (base, state) => ({
                  ...base,
                  alignItems: "flex-start",
                  backgroundColor: state.isSelected
                    ? "#3b82f6"
                    : state.isFocused
                    ? "#f1f5f9"
                    : "white",
                  color: state.isSelected ? "white" : "#1e293b",
                  cursor: "pointer",
                  paddingTop: 8,
                  paddingBottom: 8,
                  minHeight: "unset",
                  "&:hover": {
                    backgroundColor: state.isSelected ? "#3b82f6" : "#f1f5f9",
                  },
                }),
                input: (base) => ({
                  ...base,
                  color: "#1e293b",
                }),
                placeholder: (base) => ({
                  ...base,
                  color: "#94a3b8",
                }),
              }}
            />
          </div>
        </div>
        <div className="filter-chips-row">
          <div className="filter-actions-container">
            <Tooltip title="Select All">
              <IconButton
                onClick={handleSelectAllGroups}
                color={
                  activeGroups.size === uniqueGroups.length
                    ? "primary"
                    : "default"
                }
                size="small"
                sx={{
                  p: "2px",
                  mr: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle sx={{ fontSize: "0.9rem" }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear All">
              <IconButton
                onClick={handleUnselectAllGroups}
                color={activeGroups.size === 0 ? "primary" : "default"}
                size="small"
                sx={{
                  p: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Cancel sx={{ fontSize: "0.9rem" }} />
              </IconButton>
            </Tooltip>
          </div>
          <div className="filter-chips-scroll">
            <div className="filter-chips-container">
              {uniqueGroups.map((group) => (
                <Chip
                  key={group}
                  label={group}
                  onClick={() => handleGroupToggle(group)}
                  variant={activeGroups.has(group) ? "filled" : "outlined"}
                  color={activeGroups.has(group) ? "primary" : "default"}
                  size="small"
                  sx={{
                    m: "2px",
                    fontWeight: 500,
                    letterSpacing: 0,
                    px: 0.8,
                    borderRadius: "12px",
                    height: "22px",
                    transition: "all 0.15s ease",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    "&:hover": {
                      transform: "translateY(-1px)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                    },
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="timeline-component">
        {isLoading && <div className="loading">Loading timeline data...</div>}
        {error && !isLoading && (
          <div className="error">
            <p>Error loading timeline: {error}</p>
            <p>Please check the CSV file format and ensure it's accessible.</p>
          </div>
        )}
        {!isLoading &&
          !error &&
          (!timelineData || !timelineData.events?.length) && (
            <div className="no-events">
              <Typography
                variant="h6"
                color="textSecondary"
                align="center"
                sx={{ mt: 4 }}
              >
                No events to display
              </Typography>
              <Typography color="textSecondary" align="center">
                {activeGroups.size === 0
                  ? "Please select at least one group to view events"
                  : "No events found for the selected groups"}
              </Typography>
            </div>
          )}
        <div
          ref={timelineContainer}
          className="timeline-container"
          style={{
            width: "100%",
            height: "750px",
            visibility:
              !isLoading && !error && timelineData?.events?.length
                ? "visible"
                : "hidden",
          }}
        />
      </div>

      <style>{`
        .timeline-wrapper {
          padding: 32px;
          background: #f8fafc;
          min-height: 100vh;
        }

        .timeline-controls {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .top-controls {
          display: flex;
          gap: 20px;
          align-items: center;
        }

        .timeline-type-selector {
          min-width: 200px;
        }

        .search-container {
          flex: 1;
          max-width: 600px;
        }

        .search-container .event-search {
          font-size: 16px;
        }

        .search-container .event-search input {
          padding: 12px;
          border-radius: 8px;
        }

        .filter-chips-row {
          margin-top: 8px;
          width: 100%;
          display: flex;
          align-items: center;
          background-color: white;
          border-radius: 4px;
          padding: 6px 8px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }
        
        .filter-actions-container {
          display: flex;
          align-items: center;
          padding-right: 6px;
          border-right: 1px solid #f1f5f9;
        }
        
        .filter-chips-scroll {
          flex: 1;
          /* Removed overflow-x: auto to allow wrapping instead of scrolling */
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
        
        .filter-chips-scroll::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
        
        .filter-chips-container {
          display: flex;
          flex-wrap: wrap; /* Changed from nowrap to wrap to allow chips to go to next line */
          padding: 0 4px;
          /* Removed min-width: min-content as it's not needed with wrapping */
        }

        .loading, .error, .no-events {
          padding: 32px;
          text-align: center;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        }

        .error {
          color: #dc2626;
          border: 1px solid #fee2e2;
          background: #fef2f2;
        }

        .no-events {
          min-height: 240px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 12px;
          color: #64748b;
        }
      `}</style>
    </div>
  );
};

export default TimelineComponent;
