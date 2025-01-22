import React, { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./App.css"; // Import CSS file for styling

function App() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [user, setUser] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  //console.log(process.env.REACT_APP_USER_INFO_API);
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      //console.log("Token Response:", tokenResponse);
      const { access_token } = tokenResponse;

      try {
        const userInfoResponse = await axios.get(
          process.env.REACT_APP_USER_INFO_API,
          {
            headers: { Authorization: `Bearer ${access_token}` },
          }
        );
        setUser({ ...userInfoResponse.data, access_token });
        //console.log("User Info:", userInfoResponse.data);

        fetchCalendarEvents(access_token);
      } catch (error) {
        console.error("Error fetching user info or events:", error);
      }
    },
    onError: (error) => {
      console.error("Login Failed:", error);
    },
    scope: process.env.REACT_APP_CALENDAR_READONLY_SCOPE,
  });

  const fetchCalendarEvents = async (accessToken) => {
    try {
      const now = new Date().toISOString();
      const response = await axios.get(
        process.env.REACT_APP_CALENDAR_EVENTS_API,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            timeMin: now,
            orderBy: "startTime",
            singleEvents: true,
          },
        }
      );
      //console.log("Calendar Events:", response.data);
      setEvents(response.data.items);
      setFilteredEvents(response.data.items);
    } catch (error) {
      console.error(
        "Error fetching calendar events:",
        error.response?.data || error.message
      );
    }
  };

  const filterEventsByDate = async () => {
    if (startDate && endDate) {
      try {
        // Set the start time of the start date (00:00:00)
        const timeMin = new Date(startDate);
        timeMin.setHours(0, 0, 0, 0); // Midnight of the start date
  
        // Set the end time of the end date (23:59:59.999)
        const timeMax = new Date(endDate);
        timeMax.setHours(23, 59, 59, 999); // Just before midnight of the next day
  
        // Convert timeMin and timeMax to ISO string format
        const timeMinFormatted = timeMin.toISOString();
        const timeMaxFormatted = timeMax.toISOString();
  
        // Make the API request
        const response = await axios.get(
          process.env.REACT_APP_CALENDAR_EVENTS_API,
          {
            headers: { Authorization: `Bearer ${user?.access_token}` },
            params: {
              timeMin: timeMinFormatted, // Filter by start time
              timeMax: timeMaxFormatted, // Filter by end time
              orderBy: "startTime", // Order events by start time
              singleEvents: true, // Ensure recurring events are expanded
            },
          }
        );
  
        //console.log("Filtered Events:", response.data);
        setFilteredEvents(response.data.items); // Update the filtered events state
      } catch (error) {
        console.error(
          "Error fetching filtered events:",
          error.response?.data || error.message
        );
      }
    } else {
      setFilteredEvents(events); // Reset to all events if no date filter is applied
    }
  };
  

  const logout = () => {
    setUser(null);
    setEvents([]);
    setFilteredEvents([]);
    setStartDate(null);
    setEndDate(null);
    //console.log("User logged out.");
  };
  function formatDate(inputDate) {
    const date = new Date(inputDate);
    const options = { year: "numeric", month: "short", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  }
  function formatDateOrTime(inputDateTime, formatType = "both") {
    // Extract date and time components from the input string
    const [datePart, timePartWithOffset] = inputDateTime.split("T");
    const [timePart] = timePartWithOffset.split("+"); // Remove timezone offset
    let formattedDate;
    let formattedTime;
    // Format the date as 'Jan 19, 2025'
    if (formatType === "date" || formatType === "both") {
      const [year, month, day] = datePart.split("-");
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      formattedDate = `${monthNames[parseInt(month, 10) - 1]} ${parseInt(
        day,
        10
      )}, ${year}`;
      if (formatType === "date") return formattedDate;
    }

    // Format the time as '4:00 PM'
    if (formatType === "time" || formatType === "both") {
      let [hours, minutes] = timePart.split(":");
      hours = parseInt(hours, 10);
      const period = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12; // Convert to 12-hour format
      formattedTime = `${hours}:${minutes} ${period}`;
      if (formatType === "time") return formattedTime;
    }

    // Combine both if 'both' is selected
    return `${formattedDate} at ${formattedTime}`;
  }
  function formatEventDate(start) {
    if (start?.date) {
      return formatDate(start.date); // Format if only 'date' is present
    } else if (start?.dateTime) {
      return formatDateOrTime(start.dateTime, "date"); // Format if 'dateTime' is present
    }
    return ""; // Fallback for missing data
  }

  function formatEventTime(start) {
    if (start?.dateTime) {
      return formatDateOrTime(start.dateTime, "time"); // Format if 'dateTime' is present
    }
    return ""; // Fallback for events without a time
  }
  const fetchEventsBySpecificDate = async () => {
    if (selectedDate) {
      try {
        // Set the start of the selected date (midnight)
        const timeMin = new Date(selectedDate);
        timeMin.setHours(0, 0, 0, 0); // Set to 00:00:00
  
        // Set the end of the selected date (just before midnight of the next day)
        const timeMax = new Date(selectedDate);
        timeMax.setHours(23, 59, 59, 999); // Set to 23:59:59.999
  
        // Convert timeMin and timeMax to ISO string format (needed for the API)
        const timeMinFormatted = timeMin.toISOString();
        const timeMaxFormatted = timeMax.toISOString();
  
        // Make the API request
        const response = await axios.get(
          `${process.env.REACT_APP_CALENDAR_EVENTS_API}?timeMin=${timeMinFormatted}&timeMax=${timeMaxFormatted}`,
          {
            headers: { Authorization: `Bearer ${user?.access_token}` }, // Pass the user's access token
          }
        );
  
        //console.log("Filtered Events:", response.data.items);
        setFilteredEvents(response.data.items); // Update the filtered events state
      } catch (error) {
        console.error(
          "Error fetching events by specific date:",
          error.response?.data || error.message
        );
      }
    } else {
      //console.log("No date selected. Resetting to all events.");
      fetchCalendarEvents(user?.access_token); // Fallback to fetch all events
    }
  };
  
  return (
    <div className="container">
      {!user ? (
        <button className="login-button cursor-pointer" onClick={login}>
          Login with Google
        </button>
      ) : (
        <div className="content">
          <div className="header">
            <h2>Welcome, {user.name}</h2>
            <p>Email: {user.email}</p>
            <button className="logout-button cursor-pointer" onClick={logout}>
              Logout
            </button>
          </div>

          <div className="filter-section">
            <h3>Filter Events by Date range</h3>
            <div className="date-pickers">
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                  endDate={endDate}
                  className="date-picker-input"

                placeholderText="Start Date"
              />
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                  placeholderText="End Date"
                  className="date-picker-input"
                  />
            </div>
            <button
              className="filter-button cursor-pointer"
              onClick={filterEventsByDate}
            >
              Filter by range
            </button>
          </div>
          <div className="filter-section">
              <h3>Filter Events by Specific Date:</h3>
              <div className="date-pickers">
              <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
                placeholderText="Select Date"
                className="date-picker-input"

            />
              </div>
            
            <button onClick={fetchEventsBySpecificDate}  className="filter-button cursor-pointer">Filter by Date</button>
          </div>
          {filteredEvents.length > 0 ? (
            <div className="events-section">
              <h3>Your Filtered Events:</h3>
              <table className="events-table">
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{event?.summary}</td>
                      <td>{formatEventDate(event?.start)}</td>
                      <td>{formatEventTime(event?.start)}</td>
                      <td>{event?.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No events found for the selected date range.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
