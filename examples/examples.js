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
