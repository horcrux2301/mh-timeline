/**
 * Parses a single CSV row into a TimelineJS event object.
 * @param {object} row - A row object from PapaParse.
 * @returns {object|null} A TimelineJS event object or null if invalid.
 */
const parseCsvRowToEvent = (row) => {
  // Ensure year is a valid number
  const year = row.Year ? parseInt(row.Year.trim(), 10) : null;
  if (year === null || isNaN(year)) {
    console.warn("Skipping row with invalid year:", row);
    return null;
  }

  // Create a base event object
  const event = {
    start_date: {
      year: year,
    },
    text: {
      headline: row.Headline || "",
      text: row.Text || "",
    },
    group: row.Group || "",
    unique_id:
      row["Unique ID"] ||
      `event-${year}-${
        row.Headline?.replace(/\s+/g, "-") ||
        Math.random().toString(36).substring(2, 9)
      }`,
  };

  // --- Add optional start date components ---
  if (row.Month && row.Month.trim() !== "") {
    const month = parseInt(row.Month.trim(), 10);
    if (!isNaN(month) && month >= 1 && month <= 12) {
      event.start_date.month = month;
    }
  }
  if (row.Day && row.Day.trim() !== "") {
    const day = parseInt(row.Day.trim(), 10);
    if (!isNaN(day) && day >= 1 && day <= 31) {
      event.start_date.day = day;
    }
  }
  if (row.Time && row.Time.includes(":")) {
    const timeParts = row.Time.split(":");
    if (timeParts.length >= 2) {
      const hour = parseInt(timeParts[0].trim(), 10);
      const minute = parseInt(timeParts[1].trim(), 10);
      if (!isNaN(hour) && hour >= 0 && hour <= 23) event.start_date.hour = hour;
      if (!isNaN(minute) && minute >= 0 && minute <= 59) event.start_date.minute = minute;
      if (timeParts.length > 2) {
        const second = parseInt(timeParts[2].trim(), 10);
        if (!isNaN(second) && second >= 0 && second <= 59) event.start_date.second = second;
      }
    }
  }

  // --- Add optional end date components ---
  if (row["End Year"] && row["End Year"].trim() !== "") {
    const endYear = parseInt(row["End Year"].trim(), 10);
    if (!isNaN(endYear)) {
      event.end_date = { year: endYear };
      if (row["End Month"] && row["End Month"].trim() !== "") {
        const endMonth = parseInt(row["End Month"].trim(), 10);
        if (!isNaN(endMonth) && endMonth >= 1 && endMonth <= 12) event.end_date.month = endMonth;
      }
      if (row["End Day"] && row["End Day"].trim() !== "") {
        const endDay = parseInt(row["End Day"].trim(), 10);
        if (!isNaN(endDay) && endDay >= 1 && endDay <= 31) event.end_date.day = endDay;
      }
      if (row["End Time"] && row["End Time"].includes(":")) {
        const endTimeParts = row["End Time"].split(":");
        if (endTimeParts.length >= 2) {
          const endHour = parseInt(endTimeParts[0].trim(), 10);
          const endMinute = parseInt(endTimeParts[1].trim(), 10);
          if (!isNaN(endHour) && endHour >= 0 && endHour <= 23) event.end_date.hour = endHour;
          if (!isNaN(endMinute) && endMinute >= 0 && endMinute <= 59) event.end_date.minute = endMinute;
          if (endTimeParts.length > 2) {
            const endSecond = parseInt(endTimeParts[2].trim(), 10);
            if (!isNaN(endSecond) && endSecond >= 0 && endSecond <= 59) event.end_date.second = endSecond;
          }
        }
      }
    }
  }

  // --- Add display date ---
  if (row["Display Date"] && row["Display Date"].trim() !== "") {
    event.display_date = row["Display Date"].trim();
  }

  // --- Add media ---
  if (row.Media && row.Media.trim() !== "") {
    event.media = { url: row.Media.trim() };
    if (row["Media Caption"]) event.media.caption = row["Media Caption"];
    if (row["Media Credit"]) event.media.credit = row["Media Credit"];
    if (row.Thumbnail) event.media.thumbnail = row.Thumbnail;
    if (row.Alt) event.media.alt = row.Alt;
    if (row.Title) event.media.title = row.Title;
    if (row.Link) event.media.link = row.Link;
    if (row["Link Target"]) event.media.link_target = row["Link Target"];
  }

  // --- Add background ---
  if (
    (row.Background && row.Background.trim() !== "") ||
    (row["Background Color"] && row["Background Color"].trim() !== "")
  ) {
    event.background = {};
    if (row.Background && row.Background.trim() !== "") {
      event.background.url = row.Background.trim();
    }
    if (row["Background Color"] && row["Background Color"].trim() !== "") {
      event.background.color = row["Background Color"].trim();
    }
  }

  // --- Add autolink ---
  if (row.Autolink === "FALSE") {
    event.autolink = false;
  }

  return event;
};

/**
 * Processes the raw CSV data from PapaParse into the TimelineJS JSON format.
 * @param {Array<object>} csvData - Array of row objects from PapaParse.
 * @returns {{ timelineJson: object|null, error: string|null }}
 */
export const processCsvData = (csvData) => {
  if (!csvData || csvData.length === 0) {
    return { timelineJson: null, error: "No data found in CSV file" };
  }

  try {
    const validData = csvData.filter(row => row.Year && row.Year.trim() !== "");

    if (validData.length === 0) {
      return { timelineJson: null, error: "No valid timeline events found. Each event must have a Year." };
    }

    const events = validData.map(parseCsvRowToEvent).filter(event => event !== null);

    if (events.length === 0) {
      return { timelineJson: null, error: "No valid timeline events found after filtering." };
    }

    // Create the base timeline JSON object
    const timelineJson = {
      events: events,
      title: {
        text: {
          headline: "Modern History Events", // Consider making this dynamic if needed
        },
      },
    };

    // --- Add title media if available in the first row ---
    const firstRow = csvData[0];
    if (firstRow && firstRow["Title Media"] && firstRow["Title Media"].trim() !== "") {
      timelineJson.title.media = { url: firstRow["Title Media"].trim() };
      if (firstRow["Title Caption"]) timelineJson.title.media.caption = firstRow["Title Caption"];
      if (firstRow["Title Credit"]) timelineJson.title.media.credit = firstRow["Title Credit"];
      if (firstRow["Title Thumbnail"]) timelineJson.title.media.thumbnail = firstRow["Title Thumbnail"];
      if (firstRow["Title Alt"]) timelineJson.title.media.alt = firstRow["Title Alt"];
      if (firstRow["Title Title"]) timelineJson.title.media.title = firstRow["Title Title"];
      if (firstRow["Title Link"]) timelineJson.title.media.link = firstRow["Title Link"];
      if (firstRow["Title Link Target"]) timelineJson.title.media.link_target = firstRow["Title Link Target"];
    }

    // --- Add title background if available in the first row ---
    if (
      firstRow &&
      ((firstRow["Title Background"] && firstRow["Title Background"].trim() !== "") ||
       (firstRow["Title Background Color"] && firstRow["Title Background Color"].trim() !== ""))
    ) {
      timelineJson.title.background = {};
      if (firstRow["Title Background"] && firstRow["Title Background"].trim() !== "") {
        timelineJson.title.background.url = firstRow["Title Background"].trim();
      }
      if (firstRow["Title Background Color"] && firstRow["Title Background Color"].trim() !== "") {
        timelineJson.title.background.color = firstRow["Title Background Color"].trim();
      }
    }

    console.log("Processed timeline data:", timelineJson);
    return { timelineJson: timelineJson, error: null };

  } catch (err) {
    console.error("Data conversion error:", err);
    return { timelineJson: null, error: "Error converting data: " + err.message };
  }
};

/**
 * Creates a simple test timeline for fallback or debugging purposes.
 * @returns {object} A TimelineJS JSON object.
 */
export const createTestTimeline = () => {
  return {
    events: [
      {
        start_date: { year: 2023, month: 4, day: 9 },
        text: { headline: "Test Event 1", text: "This is a test event." },
      },
      {
        start_date: { year: 2024, month: 1, day: 15 },
        text: { headline: "Test Event 2", text: "Another test event." },
      },
      {
        start_date: { year: 2025, month: 4, day: 9 },
        end_date: { year: 2025, month: 12, day: 31 },
        text: { headline: "Current Test Event", text: "Spans time." },
      },
    ],
    title: {
      text: { headline: "Test Timeline", text: "Fallback timeline." },
    },
  };
};
