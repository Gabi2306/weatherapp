// API key for OpenWeatherMap
const apiKey = "YOUR_API_KEY" // Replace with your actual API key

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

// Function to get user's location
function getUserLocation() {
  showLoader()
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        getWeatherByCoordinates(position.coords.latitude, position.coords.longitude)
      },
      (error) => {
        hideLoader()
        showError(`Geolocation error: ${error.message}`)
        console.error("Geolocation error:", error)
      },
    )
  } else {
    hideLoader()
    showError("Geolocation is not supported by your browser")
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
      throw new Error("City not found")
    }

    currentWeatherData = await currentWeatherResponse.json()

    // Get forecast data (One Call API for 7-day forecast)
    const { lat, lon } = currentWeatherData.coord
    await getOneCallData(lat, lon)
  } catch (error) {
    hideLoader()
    showError("City not found. Please try again.")
    console.error("Error fetching weather data:", error)
  }
}

// Function to get weather by coordinates
async function getWeatherByCoordinates(lat, lon) {
  try {
    // Get current weather
    const currentWeatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`,
    )

    if (!currentWeatherResponse.ok) {
      throw new Error("Weather data not available")
    }

    currentWeatherData = await currentWeatherResponse.json()

    // Get forecast data (One Call API)
    await getOneCallData(lat, lon)
  } catch (error) {
    hideLoader()
    showError("Unable to get weather data for your location")
    console.error("Error fetching weather data:", error)
  }
}

// Function to get One Call API data (includes current, hourly, and daily forecast)
async function getOneCallData(lat, lon) {
  try {
    const oneCallResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=metric&exclude=minutely,alerts&appid=${apiKey}`,
    )

    if (!oneCallResponse.ok) {
      throw new Error("Forecast data not available")
    }

    forecastData = await oneCallResponse.json()

    // Display weather data
    displayCurrentWeather()
    displayForecast()

    // Show weather container and hide error
    hideLoader()
    weatherContainer.classList.remove("hidden")
    errorMessage.classList.add("hidden")
  } catch (error) {
    hideLoader()
    showError("Unable to get forecast data")
    console.error("Error fetching forecast data:", error)
  }
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

  // Display 7-day forecast
  forecastData.daily.slice(0, 7).forEach((day, index) => {
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
  const options = {
    day: "short", // 'numeric', '2-digit'
    month: "short", // 'numeric', '2-digit', 'narrow', 'short', 'long'
    year: "numeric",
    weekday: "short", // 'narrow', 'short', 'long'
  }

  if (format === "full") {
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

// Initialize the app - try to get user's location on page load
window.addEventListener("load", getUserLocation)

