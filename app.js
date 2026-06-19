const DEFAULT_CITIES = [
    { name: "İstanbul", lat: 41.0138, lon: 28.9497, isDefault: true },
    { name: "Ankara", lat: 39.9199, lon: 32.8543, isDefault: true },
    { name: "Afyonkarahisar", lat: 38.7567, lon: 30.5433, isDefault: true }
];

let cities = [];
let userPreferences = {
    notifyStorm: true,
    notifyCold: true
};

const weatherContent = document.getElementById("weather-content");
const searchInput = document.getElementById("search-input");
const searchSuggestions = document.getElementById("search-suggestions");
const searchBtn = document.getElementById("search-btn");
const changeLocationBtn = document.getElementById("change-location-btn");

const onboardingModal = document.getElementById("onboarding-modal");
const obCity = document.getElementById("ob-city");
const obDistrict = document.getElementById("ob-district");
const districtWarning = document.getElementById("district-warning");
const obNotifyStorm = document.getElementById("ob-notify-storm");
const obNotifyCold = document.getElementById("ob-notify-cold");
const saveLocationBtn = document.getElementById("save-location-btn");
const dynamicBg = document.getElementById("dynamic-bg");

const WMO_CODES = {
    0: { icon: "☀️", desc: "Açık", type: "clear" },
    1: { icon: "🌤️", desc: "Çoğunlukla Açık", type: "clear" },
    2: { icon: "⛅", desc: "Parçalı Bulutlu", type: "cloudy" },
    3: { icon: "☁️", desc: "Çok Bulutlu", type: "cloudy" },
    45: { icon: "🌫️", desc: "Sisli", type: "fog" },
    48: { icon: "🌫️", desc: "Puslu", type: "fog" },
    51: { icon: "🌧️", desc: "Hafif Çiseleyen Yağmur", type: "rain" },
    53: { icon: "🌧️", desc: "Orta Çiseleyen Yağmur", type: "rain" },
    55: { icon: "🌧️", desc: "Yoğun Çiseleyen Yağmur", type: "rain" },
    56: { icon: "🌧️❄️", desc: "Hafif Dondurucu Çisenti", type: "snow" },
    57: { icon: "🌧️❄️", desc: "Yoğun Dondurucu Çisenti", type: "snow" },
    61: { icon: "🌧️", desc: "Hafif Yağmurlu", type: "rain" },
    63: { icon: "🌧️", desc: "Orta Şiddetli Yağmurlu", type: "rain" },
    65: { icon: "🌧️", desc: "Şiddetli Yağmurlu", type: "rain" },
    66: { icon: "🌧️❄️", desc: "Hafif Dondurucu Yağmur", type: "snow" },
    67: { icon: "🌧️❄️", desc: "Şiddetli Dondurucu Yağmur", type: "snow" },
    71: { icon: "🌨️", desc: "Hafif Kar Yağışlı", type: "snow" },
    73: { icon: "🌨️", desc: "Orta Şiddetli Kar Yağışlı", type: "snow" },
    75: { icon: "🌨️", desc: "Yoğun Kar Yağışlı", type: "snow" },
    77: { icon: "🌨️", desc: "Kar Taneleri", type: "snow" },
    80: { icon: "🌦️", desc: "Hafif Sağanak Yağışlı", type: "rain" },
    81: { icon: "🌧️", desc: "Orta Şiddetli Sağanak Yağışlı", type: "rain" },
    82: { icon: "🌧️", desc: "Şiddetli Sağanak Yağışlı", type: "storm" },
    85: { icon: "🌨️", desc: "Hafif Kar Sağanağı", type: "snow" },
    86: { icon: "🌨️", desc: "Yoğun Kar Sağanağı", type: "snow" },
    95: { icon: "⛈️", desc: "Gök Gürültülü Fırtına", type: "storm" },
    96: { icon: "⛈️", desc: "Hafif Dolu ile Fırtına", type: "storm" },
    99: { icon: "⛈️", desc: "Şiddetli Dolu ile Fırtına", type: "storm" }
};

function getWeatherInfo(code) {
    return WMO_CODES[code] || { icon: "❓", desc: "Bilinmiyor", type: "default" };
}

function getDayName(dateString) {
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const date = new Date(dateString);
    return days[date.getDay()];
}

async function fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Hava durumu alınamadı.");
    return await res.json();
}

function updateDynamicBackground(weatherType) {
    dynamicBg.className = `bg-${weatherType}`;
}

async function checkAndSendNotifications(currentTemp, weatherCode) {
    if (Notification.permission !== "granted") return;
    
    const info = getWeatherInfo(weatherCode);
    
    // Check Storm
    if (userPreferences.notifyStorm && info.type === 'storm') {
        new Notification("Fırtına Uyarısı! ⛈️", {
            body: `Bulunduğunuz konumda fırtına bekleniyor. Lütfen dikkatli olun.`,
            icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⛈️</text></svg>"
        });
    }
    
    // Check Cold
    if (userPreferences.notifyCold && currentTemp <= 0) {
        new Notification("Aşırı Soğuk Uyarısı! ❄️", {
            body: `Hava sıcaklığı ${currentTemp}°C. Don olaylarına karşı dikkatli olun.`,
            icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>❄️</text></svg>"
        });
    }
}

async function renderWeather() {
    weatherContent.innerHTML = '<div class="loader">Hava durumu verileri yükleniyor...</div>';
    let html = '';
    
    for (let i = 0; i < cities.length; i++) {
        const city = cities[i];
        try {
            const data = await fetchWeather(city.lat, city.lon);
            const currentTemp = Math.round(data.current_weather.temperature);
            const currentCode = data.current_weather.weathercode;
            const currentInfo = getWeatherInfo(currentCode);
            
            // Set dynamic bg based on primary location (index 0)
            if (i === 0) {
                updateDynamicBackground(currentInfo.type);
                checkAndSendNotifications(currentTemp, currentCode);
            }
            
            let forecastHtml = '<div class="forecast-list">';
            for (let j = 0; j < 7; j++) {
                const dateStr = data.daily.time[j];
                const dayName = j === 0 ? "Bugün" : getDayName(dateStr);
                const maxTemp = Math.round(data.daily.temperature_2m_max[j]);
                const minTemp = Math.round(data.daily.temperature_2m_min[j]);
                const code = data.daily.weathercode[j];
                const info = getWeatherInfo(code);
                
                forecastHtml += `
                    <div class="forecast-item">
                        <div class="forecast-day">${dayName}</div>
                        <div class="forecast-condition-icon" title="${info.desc}">${info.icon}</div>
                        <div class="forecast-temps">
                            <span class="temp-min">${minTemp}°</span>
                            <span class="temp-max">${maxTemp}°</span>
                        </div>
                    </div>
                `;
            }
            forecastHtml += '</div>';

            let removeBtnHtml = '';
            let primaryBadge = '';
            
            if (i === 0 && city.isPrimary) {
                primaryBadge = `<span class="primary-badge">Ana Konum</span>`;
            } else if (!city.isDefault) {
                removeBtnHtml = `<button class="remove-btn" onclick="removeCity(${i})">Sil</button>`;
            }
            
            html += `
                <div class="city-card ${i===0 && city.isPrimary ? 'is-primary' : ''}">
                    <div class="city-header">
                        <div class="city-info">
                            <div class="city-name">${city.name} ${primaryBadge} ${removeBtnHtml}</div>
                            <div class="city-condition">${currentInfo.desc}</div>
                        </div>
                        <div class="current-temp-container">
                            <div class="current-temp">${currentTemp}°C</div>
                        </div>
                    </div>
                    ${forecastHtml}
                </div>
            `;
            
        } catch (err) {
            console.error(err);
            html += `<div class="city-card"><div class="city-name">${city.name}</div><div style="color:red">Veri yüklenemedi.</div></div>`;
        }
    }
    
    weatherContent.innerHTML = html;
}

window.removeCity = function(index) {
    cities.splice(index, 1);
    renderWeather();
}

let searchTimeout = null;
searchInput.addEventListener("input", (e) => {
    const val = e.target.value.trim();
    if (val.length < 2) {
        searchSuggestions.classList.add("hidden");
        return;
    }
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&language=tr&count=5`);
            const data = await res.json();
            
            if (data.results && data.results.length > 0) {
                let html = '';
                data.results.forEach(result => {
                    const country = result.country ? `, ${result.country}` : '';
                    const admin1 = result.admin1 ? ` (${result.admin1})` : '';
                    html += `
                        <div class="suggestion-item" onclick="addCity('${result.name.replace(/'/g, "\\'")}', ${result.latitude}, ${result.longitude})">
                            <strong>${result.name}</strong>${admin1}${country}
                        </div>
                    `;
                });
                searchSuggestions.innerHTML = html;
                searchSuggestions.classList.remove("hidden");
            } else {
                searchSuggestions.innerHTML = '<div class="suggestion-item">Şehir bulunamadı.</div>';
                searchSuggestions.classList.remove("hidden");
            }
        } catch (err) {
            console.error(err);
        }
    }, 500);
});

window.addCity = function(name, lat, lon) {
    const exists = cities.find(c => Math.abs(c.lat - lat) < 0.1 && Math.abs(c.lon - lon) < 0.1);
    if (!exists) {
        // Ana konum (index 0) korunsun, ondan sonraki sıraya ekle
        cities.splice(1, 0, { name, lat, lon, isDefault: false });
    }
    searchInput.value = '';
    searchSuggestions.classList.add("hidden");
    renderWeather();
}

document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
        searchSuggestions.classList.add('hidden');
    }
});

// Onboarding Logic
obDistrict.addEventListener("input", (e) => {
    if (e.target.value.trim() === "") {
        districtWarning.classList.remove("hidden");
    } else {
        districtWarning.classList.add("hidden");
    }
});

if (changeLocationBtn) {
    changeLocationBtn.addEventListener("click", () => {
        onboardingModal.classList.remove("hidden");
    });
}

saveLocationBtn.addEventListener("click", async () => {
    const city = obCity.value.trim();
    const district = obDistrict.value.trim();
    
    if (!city) {
        alert("Lütfen bir şehir girin.");
        return;
    }
    
    const query = district ? `${district}, ${city}` : city;
    saveLocationBtn.innerText = "Bulunuyor...";
    saveLocationBtn.disabled = true;
    
    try {
        let res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&language=tr&count=1`);
        let data = await res.json();
        
        // Eğer ilçe ile arama sonuç vermezse, sadece şehir adıyla tekrar ara
        if ((!data.results || data.results.length === 0) && district) {
            res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&language=tr&count=1`);
            data = await res.json();
        }
        
        if (data.results && data.results.length > 0) {
            const loc = data.results[0];
            const primaryLocation = {
                name: loc.name,
                lat: loc.latitude,
                lon: loc.longitude,
                isPrimary: true
            };
            
            userPreferences.notifyStorm = obNotifyStorm.checked;
            userPreferences.notifyCold = obNotifyCold.checked;
            
            localStorage.setItem('userLocation', JSON.stringify(primaryLocation));
            localStorage.setItem('userPrefs', JSON.stringify(userPreferences));
            
            const isSameCity = (dc, loc) => {
                const dcName = dc.name.toLocaleLowerCase('tr-TR');
                const locName = loc.name.toLocaleLowerCase('tr-TR');
                const nameMatch = locName.includes(dcName) || dcName.includes(locName.split(' ')[0]);
                const distMatch = Math.abs(dc.lat - loc.lat) < 0.6 && Math.abs(dc.lon - loc.lon) < 0.6;
                return nameMatch || distMatch;
            };
            
            const filteredDefaults = DEFAULT_CITIES.filter(dc => !isSameCity(dc, primaryLocation));
            cities = [primaryLocation, ...filteredDefaults];
            onboardingModal.classList.add('hidden');
            
            // Request Notification Permission
            if (userPreferences.notifyStorm || userPreferences.notifyCold) {
                if (Notification.permission !== "granted" && Notification.permission !== "denied") {
                    await Notification.requestPermission();
                }
            }
            
            renderWeather();
        } else {
            alert("Konum bulunamadı. Lütfen daha bilindik bir isim girin.");
        }
    } catch (err) {
        console.error(err);
        alert("Bir hata oluştu.");
    } finally {
        saveLocationBtn.innerText = "Kaydet ve Başla";
        saveLocationBtn.disabled = false;
    }
});

function initApp() {
    const savedLoc = localStorage.getItem('userLocation');
    const savedPrefs = localStorage.getItem('userPrefs');
    
    if (savedPrefs) {
        userPreferences = JSON.parse(savedPrefs);
    }
    
    if (savedLoc) {
        const primaryLocation = JSON.parse(savedLoc);
        const isSameCity = (dc, loc) => {
            const dcName = dc.name.toLocaleLowerCase('tr-TR');
            const locName = loc.name.toLocaleLowerCase('tr-TR');
            const nameMatch = locName.includes(dcName) || dcName.includes(locName.split(' ')[0]);
            const distMatch = Math.abs(dc.lat - loc.lat) < 0.6 && Math.abs(dc.lon - loc.lon) < 0.6;
            return nameMatch || distMatch;
        };
        const filteredDefaults = DEFAULT_CITIES.filter(dc => !isSameCity(dc, primaryLocation));
        cities = [primaryLocation, ...filteredDefaults];
        renderWeather();
    } else {
        onboardingModal.classList.remove('hidden');
        districtWarning.classList.remove('hidden'); // Show warning initially since district is empty
    }
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            console.log('Service Worker kayıtlı.', reg);
        }).catch(err => {
            console.error('Service Worker hatası:', err);
        });
    });
}

initApp();
