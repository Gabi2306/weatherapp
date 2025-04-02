// API key for OpenWeatherMap
const apiKey = "c3bfd7e4191d3857ff73b4dd9952795e" // Using the new provided API key

// DOM elements
const searchInput = document.getElementById("search-input")
const searchBtn = document.getElementById("search-btn")
const locationBtn = document.getElementById("location-btn")
const cityName = document.getElementById("city-name")
const currentDate = document.getElementById("current-date")
const weatherIcon = document.getElementById("weather-icon")
const weatherDescription = document.getElementById("weather-description")
const temperature = document.getElementById("temperature")
const tempUnit = document.getElementById("temp-unit")
const feelsLike = document.getElementById("feels-like")
const humidity = document.getElementById("humidity")
const windSpeed = document.getElementById("wind-speed")
const pressure = document.getElementById("pressure")
const weatherContainer = document.getElementById("weather-container")
const errorMessage = document.getElementById("error-message")
const forecastDays = document.getElementById("forecast-days")
const loader = document.getElementById("loader")
const celsiusBtn = document.getElementById("celsius-btn")
const fahrenheitBtn = document.getElementById("fahrenheit-btn")

// Variables to store weather data
let currentWeatherData = null
let forecastData = null
let isMetric = true // Default to Celsius

// Event listeners
searchBtn.addEventListener("click", () => {
  getWeatherByCity(searchInput.value.trim())
})

searchInput.addEventListener("keyup", (event) => {
  if (event.key === "Enter") {
    getWeatherByCity(searchInput.value.trim())
  }
})

locationBtn.addEventListener("click", getUserLocation)

celsiusBtn.addEventListener("click", () => {
  if (!isMetric) {
    isMetric = true
    celsiusBtn.classList.add("active")
    fahrenheitBtn.classList.remove("active")
    updateTemperatureDisplay()
  }
})

fahrenheitBtn.addEventListener("click", () => {
  if (isMetric) {
    isMetric = false
    fahrenheitBtn.classList.add("active")
    celsiusBtn.classList.remove("active")
    updateTemperatureDisplay()
  }
})

// Function to verify API key is working
async function verifyApiKey() {
  try {
    // Test the API key with a simple request
    const testResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=London&units=metric&appid=${apiKey}`,
    )

    if (!testResponse.ok) {
      const errorData = await testResponse.json()
      throw new Error(`API key verification failed: ${errorData.message}`)
    }

    console.log("API key verified successfully")
    return true
  } catch (error) {
    console.error("API key verification failed:", error)
    showError(`API key error: ${error.message}. Please check your API key.`)
    return false
  }
}

// Function to get user's location
function getUserLocation() {
  showLoader()

  // Add a timeout to handle cases where geolocation takes too long
  const locationTimeout = setTimeout(() => {
    hideLoader()
    showError("Location request timed out. Please search for a city instead.")
  }, 15000)

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(locationTimeout)
        console.log("Got user location:", position.coords.latitude, position.coords.longitude)
        getWeatherByCoordinates(position.coords.latitude, position.coords.longitude)
      },
      (error) => {
        clearTimeout(locationTimeout)
        hideLoader()

        let errorMsg = "Unable to get your location. "

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg += "Please allow location access and try again."
            break
          case error.POSITION_UNAVAILABLE:
            errorMsg += "Location information is unavailable."
            break
          case error.TIMEOUT:
            errorMsg += "Location request timed out."
            break
          default:
            errorMsg += "An unknown error occurred."
        }

        console.error("Geolocation error:", error)
        showError(errorMsg)

        // As a fallback, try to get location by IP
        getLocationByIP()
      },
      {
        timeout: 10000,
        maximumAge: 60000,
        enableHighAccuracy: false,
      },
    )
  } else {
    clearTimeout(locationTimeout)
    hideLoader()
    showError("Geolocation is not supported by your browser. Please search for a city instead.")
  }
}

// Function to get weather by city name
async function getWeatherByCity(city) {
  if (!city) return

  showLoader()

  try {
    // Get current weather
    const currentWeatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`,
    )

    if (!currentWeatherResponse.ok) {
      const errorData = await currentWeatherResponse.json()
      throw new Error(`City not found: ${errorData.message}`)
    }

    currentWeatherData = await currentWeatherResponse.json()
    console.log("Current weather data for city:", currentWeatherData)

    // Get forecast data (One Call API for 7-day forecast)
    const { lat, lon } = currentWeatherData.coord
    await getOneCallData(lat, lon)
  } catch (error) {
    hideLoader()
    showError(`Error: ${error.message}`)
    console.error("Error fetching weather data:", error)
  }
}

// Function to get weather by coordinates
async function getWeatherByCoordinates(lat, lon) {
  try {
    console.log(`Fetching weather data for coordinates: ${lat}, ${lon}`)

    // Get current weather
    const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
    console.log("Current weather URL:", currentWeatherUrl)

    const currentWeatherResponse = await fetch(currentWeatherUrl)

    if (!currentWeatherResponse.ok) {
      const errorData = await currentWeatherResponse.json()
      console.error("Current weather API error:", errorData)
      throw new Error(`Weather data not available: ${errorData.message}`)
    }

    currentWeatherData = await currentWeatherResponse.json()
    console.log("Current weather data:", currentWeatherData)

    // Get forecast data
    await getOneCallData(lat, lon)
  } catch (error) {
    hideLoader()
    console.error("Error fetching weather data:", error)
    showError(`Unable to get weather data: ${error.message}`)

    // Show search box as fallback
    document.querySelector(".search-box").style.display = "flex"
    document.querySelector(".app-header h1").style.marginBottom = "20px"
  }
}

// Function to get One Call API data (includes current, hourly, and daily forecast)
async function getOneCallData(lat, lon) {
  try {
    // Use the 5-day forecast API
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
    console.log("Forecast URL:", forecastUrl)

    const forecastResponse = await fetch(forecastUrl)

    if (!forecastResponse.ok) {
      const errorData = await forecastResponse.json()
      console.error("Forecast API error:", errorData)
      throw new Error(`Forecast data not available: ${errorData.message}`)
    }

    const forecastRawData = await forecastResponse.json()
    console.log("Forecast raw data received")

    if (!forecastRawData.list || forecastRawData.list.length === 0) {
      throw new Error("No forecast data available in the API response")
    }

    // Process the 5-day forecast data to create a daily forecast
    forecastData = {
      current: {
        temp: currentWeatherData.main.temp,
        feels_like: currentWeatherData.main.feels_like,
        humidity: currentWeatherData.main.humidity,
        pressure: currentWeatherData.main.pressure,
        wind_speed: currentWeatherData.wind.speed,
        weather: currentWeatherData.weather,
      },
      daily: processForecastData(forecastRawData.list),
    }

    // Display weather data
    displayCurrentWeather()
    displayForecast()

    // Show weather container and hide error
    hideLoader()
    weatherContainer.classList.remove("hidden")
    errorMessage.classList.add("hidden")
  } catch (error) {
    hideLoader()
    console.error("Error fetching forecast data:", error)
    showError(`Unable to get forecast data: ${error.message}`)
  }
}

// Add this new function to process the forecast data
function processForecastData(forecastList) {
  // Group forecast by day
  const dailyData = {}

  forecastList.forEach((item) => {
    const date = new Date(item.dt * 1000)
    const day = date.toISOString().split("T")[0]

    if (!dailyData[day]) {
      dailyData[day] = {
        dt: date.getTime() / 1000,
        temp: {
          min: item.main.temp_min,
          max: item.main.temp_max,
        },
        weather: item.weather,
      }
    } else {
      // Update min/max temperatures
      if (item.main.temp_min < dailyData[day].temp.min) {
        dailyData[day].temp.min = item.main.temp_min
      }
      if (item.main.temp_max > dailyData[day].temp.max) {
        dailyData[day].temp.max = item.main.temp_max
      }
    }
  })

  // Convert to array and sort by date
  return Object.values(dailyData).sort((a, b) => a.dt - b.dt)
}

// Function to display current weather
function displayCurrentWeather() {
  if (!currentWeatherData || !forecastData) return

  // Set city name and date
  cityName.textContent = `${currentWeatherData.name}, ${currentWeatherData.sys.country}`
  currentDate.textContent = formatDate(new Date(), "full")

  // Set weather description
  weatherDescription.textContent = currentWeatherData.weather[0].description

  // Set weather icon
  setWeatherIcon(weatherIcon, currentWeatherData.weather[0].id, currentWeatherData.weather[0].icon)

  // Update temperature display
  updateTemperatureDisplay()
}

// Function to update temperature display based on selected unit
function updateTemperatureDisplay() {
  if (!currentWeatherData || !forecastData) return

  const currentTemp = isMetric ? forecastData.current.temp : celsiusToFahrenheit(forecastData.current.temp)

  const feelsLikeTemp = isMetric
    ? forecastData.current.feels_like
    : celsiusToFahrenheit(forecastData.current.feels_like)

  // Set temperature and feels like
  temperature.textContent = Math.round(currentTemp)
  tempUnit.textContent = isMetric ? "°C" : "°F"
  feelsLike.textContent = `${Math.round(feelsLikeTemp)}${isMetric ? "°C" : "°F"}`

  // Set other weather details
  humidity.textContent = `${forecastData.current.humidity}%`
  windSpeed.textContent = `${(forecastData.current.wind_speed * (isMetric ? 3.6 : 2.237)).toFixed(1)} ${isMetric ? "km/h" : "mph"}`
  pressure.textContent = `${forecastData.current.pressure} hPa`

  // Update forecast temperatures
  displayForecast()
}

// Function to display forecast
function displayForecast() {
  if (!forecastData) return

  forecastDays.innerHTML = ""

  // Display 7-day forecast (or as many days as we have)
  const daysToShow = Math.min(forecastData.daily.length, 7)

  forecastData.daily.slice(0, daysToShow).forEach((day, index) => {
    const date = new Date(day.dt * 1000)
    const dayName = index === 0 ? "Today" : formatDate(date, "day")
    const maxTemp = isMetric ? day.temp.max : celsiusToFahrenheit(day.temp.max)
    const minTemp = isMetric ? day.temp.min : celsiusToFahrenheit(day.temp.min)
    const weatherId = day.weather[0].id
    const iconCode = day.weather[0].icon

    const forecastDay = document.createElement("div")
    forecastDay.className = "forecast-day"

    const forecastIcon = document.createElement("i")
    forecastIcon.className = "forecast-icon"
    setWeatherIcon(forecastIcon, weatherId, iconCode)

    forecastDay.innerHTML = `
      <p class="day-name">${dayName}</p>
      ${forecastIcon.outerHTML}
      <p class="forecast-temp">${Math.round(maxTemp)}° / ${Math.round(minTemp)}°</p>
      <p class="forecast-desc">${day.weather[0].description}</p>
    `

    forecastDays.appendChild(forecastDay)
  })
}

// Function to set weather icon based on weather id and icon code
function setWeatherIcon(element, weatherId, iconCode) {
  // Check if it's day or night
  const isDay = iconCode.includes("d")

  // Set icon based on weather id
  if (weatherId >= 200 && weatherId < 300) {
    // Thunderstorm
    element.className = isDay ? "fas fa-bolt weather-icon" : "fas fa-bolt weather-icon"
    element.style.color = "#ffaa00"
  } else if (weatherId >= 300 && weatherId < 400) {
    // Drizzle
    element.className = isDay ? "fas fa-cloud-rain weather-icon" : "fas fa-cloud-rain weather-icon"
    element.style.color = "#4cc9f0"
  } else if (weatherId >= 500 && weatherId < 600) {
    // Rain
    element.className = isDay ? "fas fa-cloud-showers-heavy weather-icon" : "fas fa-cloud-showers-heavy weather-icon"
    element.style.color = "#4361ee"
  } else if (weatherId >= 600 && weatherId < 700) {
    // Snow
    element.className = isDay ? "fas fa-snowflake weather-icon" : "fas fa-snowflake weather-icon"
    element.style.color = "#a8dadc"
  } else if (weatherId >= 700 && weatherId < 800) {
    // Atmosphere (fog, mist, etc.)
    element.className = isDay ? "fas fa-smog weather-icon" : "fas fa-smog weather-icon"
    element.style.color = "#adb5bd"
  } else if (weatherId === 800) {
    // Clear
    element.className = isDay ? "fas fa-sun weather-icon" : "fas fa-moon weather-icon"
    element.style.color = isDay ? "#ffaa00" : "#f8f9fa"
  } else if (weatherId > 800 && weatherId < 900) {
    // Clouds
    if (weatherId === 801) {
      // Few clouds
      element.className = isDay ? "fas fa-cloud-sun weather-icon" : "fas fa-cloud-moon weather-icon"
      element.style.color = isDay ? "#4cc9f0" : "#adb5bd"
    } else {
      // More clouds
      element.className = "fas fa-cloud weather-icon"
      element.style.color = "#adb5bd"
    }
  } else {
    // Default
    element.className = isDay ? "fas fa-sun weather-icon" : "fas fa-moon weather-icon"
    element.style.color = isDay ? "#ffaa00" : "#f8f9fa"
  }
}

// Helper function to convert Celsius to Fahrenheit
function celsiusToFahrenheit(celsius) {
  return (celsius * 9) / 5 + 32
}

// Helper function to format date
function formatDate(date, format) {
  if (format === "full") {
    const options = {
      day: "numeric", // Changed from "short" to "numeric"
      month: "short",
      year: "numeric",
      weekday: "short",
    }
    return date.toLocaleDateString("en-US", options)
  } else if (format === "day") {
    return date.toLocaleDateString("en-US", { weekday: "short" })
  }

  return date.toLocaleDateString()
}

// Function to show loader
function showLoader() {
  loader.classList.remove("hidden")
  weatherContainer.classList.add("hidden")
  errorMessage.classList.add("hidden")
}

// Function to hide loader
function hideLoader() {
  loader.classList.add("hidden")
}

// Function to show error
function showError(message) {
  errorMessage.querySelector("p").textContent = message
  errorMessage.classList.remove("hidden")
  weatherContainer.classList.add("hidden")
}

// Add this new function to get location by IP as a fallback
async function getLocationByIP() {
  try {
    console.log("Attempting to get location by IP...")
    const response = await fetch("https://ipapi.co/json/")
    const data = await response.json()

    if (data.latitude && data.longitude) {
      console.log("Got location by IP:", data.latitude, data.longitude)
      getWeatherByCoordinates(data.latitude, data.longitude)
    } else {
      // If we can't get coordinates, try to get weather by city name
      if (data.city) {
        console.log("Got city by IP:", data.city)
        getWeatherByCity(data.city)
      } else {
        // Default to a major city if all else fails
        getWeatherByCity("New York")
      }
    }
  } catch (error) {
    console.error("Error getting location by IP:", error)
    // Default to a major city if all else fails
    getWeatherByCity("New York")
  }
}

// Initialize the app
window.addEventListener("load", async () => {
  console.log("Weather app initializing...")
  console.log("Using API key:", apiKey)

  // First verify the API key
  const isApiKeyValid = await verifyApiKey()

  if (isApiKeyValid) {
    // Try to get user location
    getUserLocation()

    // Add a fallback - if after 5 seconds we still don't have weather data, try IP location
    setTimeout(() => {
      if (!currentWeatherData && !document.querySelector(".error:not(.hidden)")) {
        console.log("No weather data after timeout, trying IP fallback...")
        getLocationByIP()
      }
    }, 5000)
  } else {
    // If API key is invalid, show a clear error message
    showError("Invalid API key. Please check your OpenWeatherMap API key.")
  }
})

