// Example page scripts for dial-selector demos

function getRandomColor() {
  return (
    '#' +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, '0')
  );
}

function handleDialChange(event) {
  console.log('Selected:', event.detail.value);
  event.target.style.setProperty('--indicator-color', getRandomColor());
  event.target.style.setProperty('--color-selection', getRandomColor());
}

// Example: Listen for change events using addEventListener
// document.addEventListener('DOMContentLoaded', () => {
// 	const selector = document.querySelector('dial-selector');
// 	if (selector) {
// 		selector.addEventListener('change', (event) => {
// 			console.log('Selection changed:', event.detail);
// 			// event.detail contains:
// 			// - value: the selected option text
// 			// - index: the selected index
// 			// - previousValue: the previous option text
// 			// - previousIndex: the previous index
// 		});
// 	}
// });

// Example: You can also use the onchange attribute directly:
// <dial-selector onchange="handleChange(event)"></dial-selector>
// function handleChange(event) {
//   console.log('Selected:', event.detail.value);
// }

function handleThemeChange(event) {
  const theme = event.detail.value.toLowerCase();
  document.body.setAttribute('data-page-theme', theme);
}

// Handle animation change - switches animation class based on selected option
function handleAnimationChange(event) {
  const selector = event.target;
  const value = event.detail.value;

  // Remove all animation classes and add the one matching the selected value
  selector.classList.remove('animate-spin', 'animate-pulse', 'animate-wiggle', 'animate-bounce', 'animate-blink');
  selector.classList.add(`animate-${value}`);
}

// Note: "Animate Active Only" now works with pure CSS!
// Just use CSS custom properties on ::part(label-active):
//
//   .my-selector::part(label) {
//     --label-icon-opacity: 0.4;
//   }
//   .my-selector::part(label-active) {
//     --label-icon-opacity: 1;
//     --label-icon-animation: spin 1s linear infinite;
//   }

// ============================================
// Basic Usage Demo (Consolidated Features)
// ============================================

// Toggle disabled state for basic demo
function toggleBasicDisabled() {
  const selector = document.getElementById('basicDemo');
  const checkbox = document.getElementById('disabledCheck');
  if (selector && checkbox) {
    selector.disabled = checkbox.checked;
    updateBasicOutput();
  }
}

// Toggle delay for basic demo
function toggleBasicDelay() {
  const selector = document.getElementById('basicDemo');
  const checkbox = document.getElementById('noDelayCheck');
  if (selector && checkbox) {
    if (checkbox.checked) {
      selector.setAttribute('time-selection-delay', '0');
    } else {
      selector.removeAttribute('time-selection-delay');
    }
  }
}

// Programmatic control for basic demo
function basicNext() {
  const selector = document.getElementById('basicDemo');
  if (selector) {
    selector.next();
    updateBasicOutput();
  }
}

function basicPrevious() {
  const selector = document.getElementById('basicDemo');
  if (selector) {
    selector.previous();
    updateBasicOutput();
  }
}

// Form submit handler for basic demo
function handleBasicFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const output = document.getElementById('basicOutput');

  const data = {};
  formData.forEach((value, key) => {
    data[key] = value;
  });

  if (output) {
    output.textContent = 'Form submitted: ' + JSON.stringify(data, null, 2);
  }
  console.log('Form data:', data);
}

// Update basic demo output
function updateBasicOutput() {
  const selector = document.getElementById('basicDemo');
  const output = document.getElementById('basicOutput');
  if (selector && output) {
    output.textContent = JSON.stringify(
      {
        value: selector.value,
        currentIndex: selector.currentIndex,
        currentLabel: selector.currentLabel,
        disabled: selector.disabled,
      },
      null,
      2
    );
  }
}

// ============================================
// Custom Animation Timing Demo
// ============================================

// Update animation delay from input
function updateAnimationDelay() {
  const selector = document.getElementById('customAnimationDemo');
  const input = document.getElementById('animationDelayInput');
  if (selector && input) {
    const value = parseInt(input.value, 10);
    if (!isNaN(value) && value >= 0) {
      selector.setAttribute('time-selection-delay', value.toString());
    }
  }
}

// Update animation duration from input
function updateAnimationDuration() {
  const selector = document.getElementById('customAnimationDemo');
  const input = document.getElementById('animationDurationInput');
  if (selector && input) {
    const value = parseInt(input.value, 10);
    if (!isNaN(value) && value >= 0) {
      selector.setAttribute('time-selection-animation', value.toString());
    }
  }
}

// Set up event listener and initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const basicDemo = document.getElementById('basicDemo');

  if (basicDemo) {
    basicDemo.addEventListener('change', (event) => {
      updateBasicOutput();
    });

    // Initialize output
    updateBasicOutput();
  }
});
