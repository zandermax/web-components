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
      --h: calc(1lh + 4px);

      position: absolute;
      width: max(700px, 100%);
      height: 100%;

      /* So you can manually test shrinking by dragging the right edge */
      resize: horizontal;
      overflow: auto;
      z-index: 1000;

      .dial-container {
        display: flex;
        height: 100%;
      }

      .spoke-lines-container {

        display: flex;
        flex-direction: column;
        width: 50%
      }

      .spoke-lines {
        height: 50%;
        flex: 1;
        position: relative;


        &.top .spoke {
          bottom: 0;
        }

        &.bottom .spoke {
          top: 0;
        }
      }

      /* Flip the spoke lines for accordant quadrants */
      .spoke-lines-container.right .spoke-lines.top,
      .spoke-lines-container.left .spoke-lines.bottom {
        transform: scaleX(-1);
      }

        .spoke {
          position: absolute;
          width: 100%;
          height: calc(
            /* edge gap: (H - N*h) / (2N) */
            ( (var(--component-height) - (var(--num-options-this-side) * var(--h)))
              / (2 * var(--num-options-this-side)) )
            +
            /* half item height */
            ( var(--h) / 2 )
            +
            /* (index-1) * step, where step = h + (H - N*h)/N */
            ( (var(--index) - 1) * (
                var(--h)
                +
                ( (var(--component-height) - (var(--num-options-this-side) * var(--h)))
                  / var(--num-options-this-side) )
              )
            )
            +
            /* odd-N correction: mod(N,2) * step/2 */
            ( mod(var(--num-options-this-side), 2) * (
                var(--h)
                +
                ( (var(--component-height) - (var(--num-options-this-side) * var(--h)))
                  / var(--num-options-this-side) )
              ) / 2 )
          );
        }
      }


      .options-container {
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        border: 2px dashed #e63946;
        /* Make each column a container for inline-size queries */
        container-type: inline-size;
        container-name: dial-options;

        flex: 1;

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
            /* margin-block-start: 0.75em; */
          }

          &:last-of-type {
            /* margin-block-end: 0.75em; */
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
    @container dial-options (max-width: 230px) {
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

    .center-container {
      flex: 1;
      display: flex;
    }

    .knob-container {
      border: 2px dotted #457b9d;
      margin-inline: 28px;

      /* Make the knob container a square */
      aspect-ratio: 1;
      align-self: center;

      /* Start at a natural/content width and shrink after options hit their minimums */
      flex: 0 1 180px;
      white-space: nowrap;
      text-align: center;
    }

    .connectors {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
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
