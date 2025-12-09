/**
 * Layout styles for selector, label columns, and dial layout overlay.
 */
export function getLayoutStyles(): string {
  return `
    .selector {
      position: relative;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: clamp(12px, 4vw, 40px);
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: visible;
    }

    .dial-layout-overlay {
      position: absolute;
      width: max(700px, 100%);
      height: 100%;
      padding-block: 0.75em;

      /* So you can manually test shrinking by dragging the right edge */
      resize: horizontal;
      overflow: auto;
      z-index: 1000;

      .dial-container {
        display: flex;
        height: 100%;
      }


      .options-container {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border: 2px dashed #e63946;
        /* Make each column a container for inline-size queries */
        container-type: inline-size;
        container-name: dial-options;

        /* Grow to take space, but be willing to shrink first */
        flex: 1 1 220px;

        /* They can shrink only until their content needs more room */
        min-width: min-content;
        white-space: nowrap;

        &:not(:has(.option)) {
          width: 0;
          display: none;
        }

        .option {
          display: grid;

          &:first-of-type {
            margin-block-start: 0.75em;
          }

          &:last-of-type {
            margin-block-end: 0.75em;
          }

          /* Both first and last = only element */
          &:first-of-type:last-of-type {
            margin-block: auto;
          }

          .option-text {
            display: inline-flex;
            border: 2px dotted #457b9d;
            text-align: center;
          }

          .option-image {
            border: 2px dotted #00ff00;
          }
        }

        &.left .option {
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));

          .option-text {
            margin-inline-start: auto;
            padding-inline-end: 1em;
          }

          /* Left side: show bottom image by default, hide top */
          .option-image.top {
            display: none;
          }

          .option-image.bottom {
            display: block;
          }
        }

        &.right .option {
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));

          .option-text {
            padding-inline-start: 1em;
          }

          /* Right side: show top image by default, hide bottom */
          .option-image.top {
            display: block;
          }

          .option-image.bottom {
            display: none;
          }
        }
      }
    }

    /* When an options column is narrow enough that items need to stack,
       force a single-column grid and reveal .option-image.bottom. */
    @container dial-options (max-width: 260px) {
      /* Match base selector specificity so this wins when stacked */
      .dial-layout-overlay .options-container.left .option,
      .dial-layout-overlay .options-container.right .option {
        grid-template-columns: 1fr;
      }

      /* When stacked, also show the secondary images:
         - Right: reveal bottom image (in addition to top).
         - Left: reveal top image (in addition to bottom). */
      .dial-layout-overlay .options-container.right .option .option-image.bottom {
        display: block;
      }

      .dial-layout-overlay .options-container.left .option .option-image.top {
        display: block;
      }
    }

    /* One-sided layouts: when host has data-one-sided, show both guides
      on the active side's options container. */
    :host([data-one-sided="left"])
      .dial-layout-overlay .options-container.left .option {
        .option-image.top,
        .option-image.bottom {
          display: block;
        }

        .option-text {
          padding-inline-end: 0;
        }
    }

    :host([data-one-sided="right"])
      .dial-layout-overlay .options-container.right .option {
        .option-image.top,
        .option-image.bottom {
          display: block;
        }

        .option-text {
          padding-inline-start: 0;
        }
      }

      /* Spokes mode styles */
      :host([mode="spokes"])
        .dial-layout-overlay .options-container .option .option-image {
        display: none;
      }

    .knob-container {
      border: 2px dotted #457b9d;
      margin-inline: 28px;

      /* Start at a natural/content width and shrink after options hit their minimums */
      flex: 0 1 180px;
      min-width: 48px;
      white-space: nowrap;
      text-align: center;
    }

    .label-column {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: var(--label-column-height, 320px);
      margin: 0;
      padding: 0;
      overflow: visible;
    }

    .label-column.left {
      align-items: flex-end;
    }

    .label-column.right {
      align-items: flex-start;
    }

    /* Position labels within their columns */
    .label-column.left .dial-label {
      right: 0;
      left: auto;
      text-align: right;
    }

    .label-column.right .dial-label {
      left: 0;
      right: auto;
      text-align: left;
    }
  `;
}

