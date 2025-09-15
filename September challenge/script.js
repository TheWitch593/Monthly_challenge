const { ipcRenderer } = require('electron');

// Window controls
document.getElementById('minimize-btn').addEventListener('click', () => {
    ipcRenderer.send('window-minimize');
});

document.getElementById('maximize-btn').addEventListener('click', () => {
    ipcRenderer.send('window-maximize');
});

document.getElementById('close-btn').addEventListener('click', () => {
    ipcRenderer.send('window-close');
});

// Application State
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let completedTasks = 0;
let timerInterval = null;
let currentTime = 25 * 60; // 25 minutes in seconds
let isTimerRunning = false;
let sessionCount = parseInt(localStorage.getItem('sessionCount')) || 0;

// Timer configurations
const timerConfigs = {
    'short': 25 * 60,      // 25 minutes
    'long': 50 * 60,       // 50 minutes
    'custom': 25 * 60,     // Default, will be overridden
    'short-break': 5 * 60, // 5 minutes
    'long-break': 15 * 60  // 15 minutes
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    renderTasks();
    updateProgress();
    updateSessionCounter();
    generateCalendar();
    
    // Update timer display
    updateTimerDisplay();
    
    // Show/hide custom time input
    document.getElementById('session-type').addEventListener('change', (e) => {
        const customTime = document.getElementById('custom-time');
        if (e.target.value === 'custom') {
            customTime.style.display = 'block';
        } else {
            customTime.style.display = 'none';
            currentTime = timerConfigs[e.target.value];
            updateTimerDisplay();
            updateMainTimerDisplay();
        }
    });
    
    // Handle custom time input
    document.getElementById('custom-minutes').addEventListener('input', (e) => {
        const minutes = parseInt(e.target.value) || 25;
        currentTime = minutes * 60;
        updateTimerDisplay();
        updateMainTimerDisplay();
    });
});

// Modal functionality
function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Calendar button
document.getElementById('calendar-btn').addEventListener('click', () => {
    openModal('calendar-modal');
});

document.getElementById('close-calendar').addEventListener('click', () => {
    closeModal('calendar-modal');
});

// Pomodoro button
document.getElementById('timer-btn').addEventListener('click', () => {
    openModal('pomodoro-modal');
});

document.getElementById('close-pomodoro').addEventListener('click', () => {
    closeModal('pomodoro-modal');
});

// Add task button
document.getElementById('add-task-btn').addEventListener('click', () => {
    openModal('add-task-modal');
});

document.getElementById('close-add-task').addEventListener('click', () => {
    closeModal('add-task-modal');
});

// Task Management
document.getElementById('save-task').addEventListener('click', () => {
    const taskInput = document.getElementById('task-input');
    const taskText = taskInput.value.trim();
    
    if (taskText) {
        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false
        };
        
        tasks.push(newTask);
        saveTasks();
        renderTasks();
        updateProgress();
        taskInput.value = '';
        closeModal('add-task-modal');
    }
});

// Enter key to add task
document.getElementById('task-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('save-task').click();
    }
});

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function renderTasks() {
    const todoList = document.getElementById('todo-list');
    todoList.innerHTML = '';
    
    tasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'todo-item';
        taskElement.innerHTML = `
            <div class="todo-checkbox ${task.completed ? 'checked' : ''}" data-id="${task.id}"></div>
            <span class="todo-text ${task.completed ? 'completed' : ''}">${task.text}</span>
            <button class="delete-btn" data-id="${task.id}">×</button>
        `;
        
        todoList.appendChild(taskElement);
    });
    
    // Add event listeners
    document.querySelectorAll('.todo-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', (e) => {
            const taskId = parseInt(e.target.dataset.id);
            toggleTask(taskId);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = parseInt(e.target.dataset.id);
            deleteTask(taskId);
        });
    });
}

function toggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
        updateProgress();
    }
}

function deleteTask(taskId) {
    tasks = tasks.filter(t => t.id !== taskId);
    saveTasks();
    renderTasks();
    updateProgress();
}

function updateProgress() {
    const completedTasksCount = tasks.filter(t => t.completed).length;
    const totalTasks = tasks.length;
    const progressPercentage = totalTasks > 0 ? (completedTasksCount / totalTasks) * 100 : 0;
    
    document.getElementById('progress-fill').style.width = `${progressPercentage}%`;
}

// Calendar Generation
function generateCalendar() {
    const calendar = document.getElementById('calendar');
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startingDay = firstDay.getDay();
    
    // Clear calendar
    calendar.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.textContent = day;
        dayHeader.style.fontWeight = 'bold';
        dayHeader.style.color = 'var(--dark-red)';
        calendar.appendChild(dayHeader);
    });
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDay; i++) {
        const emptyDay = document.createElement('div');
        calendar.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayElement = document.createElement('div');
        dayElement.textContent = day;
        dayElement.className = 'calendar-day';
        
        if (day === today.getDate() && 
            currentMonth === today.getMonth() && 
            currentYear === today.getFullYear()) {
            dayElement.classList.add('today');
        }
        
        calendar.appendChild(dayElement);
    }
}

// Pomodoro Timer
document.getElementById('session-type').addEventListener('change', (e) => {
    const sessionType = e.target.value;
    currentTime = timerConfigs[sessionType];
    updateTimerDisplay();
    updateMainTimerDisplay();
});

document.getElementById('start-timer').addEventListener('click', startTimer);
document.getElementById('pause-timer').addEventListener('click', pauseTimer);
document.getElementById('reset-timer').addEventListener('click', resetTimer);

function startTimer() {
    if (!isTimerRunning) {
        isTimerRunning = true;
        timerInterval = setInterval(() => {
            currentTime--;
            updateTimerDisplay();
            updateMainTimerDisplay();
            
            if (currentTime <= 0) {
                pauseTimer();
                // Timer completed
                if (document.getElementById('session-type').value === 'work') {
                    sessionCount++;
                    updateSessionCounter();
                    localStorage.setItem('sessionCount', sessionCount.toString());
                }
                alert('Timer completed!');
                resetTimer();
            }
        }, 1000);
    }
}

function pauseTimer() {
    isTimerRunning = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimer() {
    pauseTimer();
    const sessionType = document.getElementById('session-type').value;
    currentTime = timerConfigs[sessionType];
    updateTimerDisplay();
    updateMainTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update modal timer display
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
        timerDisplay.textContent = timeString;
    }
}

function updateMainTimerDisplay() {
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update main button timer display
    const mainTimerText = document.getElementById('timer-text');
    if (mainTimerText) {
        mainTimerText.textContent = timeString;
    }
}

function updateSessionCounter() {
    const sessionCountElement = document.getElementById('session-count');
    if (sessionCountElement) {
        sessionCountElement.textContent = sessionCount;
    }
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape key closes modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });
    }
    
    // Ctrl/Cmd + N for new task
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openModal('add-task-modal');
        setTimeout(() => {
            document.getElementById('task-input').focus();
        }, 100);
    }
    
    // Space bar to start/pause timer when pomodoro modal is open
    if (e.code === 'Space' && document.getElementById('pomodoro-modal').classList.contains('show')) {
        e.preventDefault();
        if (isTimerRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }
});

// Notification permission (optional)
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// Show notification when timer completes
function showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Autumn Productivity', {
            body: message,
            icon: './assets/pumpkin-icon.png'
        });
    }
}

// Auto-save tasks every 30 seconds
setInterval(() => {
    saveTasks();
}, 30000);

// Create falling leaves and pumpkins in TO DO section
function createFallingElement(type) {
    const todoSection = document.querySelector('.right-section');
    const element = document.createElement('img');
    
    if (type === 'leaf') {
        element.src = 'assets/png2.png';
        element.className = 'falling-leaf';
        element.alt = 'Falling Leaf';
    } else {
        element.src = 'assets/png1.png';
        element.className = 'falling-pumpkin';
        element.alt = 'Falling Pumpkin';
    }
    
    // Random horizontal position within the TO DO section
    element.style.left = Math.random() * (todoSection.offsetWidth - 20) + 'px';
    element.style.top = '-20px';
    
    todoSection.appendChild(element);
    
    // Remove element after animation completes
    setTimeout(() => {
        if (element.parentNode) {
            element.remove();
        }
    }, type === 'leaf' ? 4000 : 5000);
}

// Create falling elements periodically in TO DO section
setInterval(() => {
    createFallingElement('leaf');
}, 2000);

setInterval(() => {
    createFallingElement('pumpkin');
}, 3500);


// Remove the old general falling leaf function and replace with TO DO specific one
// setInterval(createFallingLeaf, 3000); // Remove this line

console.log('🍂 Autumn Productivity App Loaded Successfully! 🎃');