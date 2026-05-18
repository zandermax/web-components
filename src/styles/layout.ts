/**
 * Layout styles for selector, label columns, and dial layout overlay.
 */
export function getLayoutStyles(): string {
  return `
    @property --w {
      syntax: "<length>";
      inherits: true;
      initial-value: 0px;
    }

    @property --h {
      syntax: "<length>";
      inherits: true;
      initial-value: 0px;
    }

    @property --angle {
      syntax: "<angle>";
      inherits: true;
      initial-value: 0deg;
    }

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
      --selected-index: 1;
      --left-count: 2;
      --right-count: 2;
      --left-is-odd: 0;
      --right-is-odd: 0;

      position: absolute;
      width: 100%;
      height: 100%;

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
        container-type: inline-size;

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
          /* Could be 100%, but is used to calculate the angle of each option */
          --w: 100cqi;
          width: var(--w);

          /* Intermediate calculations for readability */
          --total-gap-space: calc(var(--component-height) - (var(--num-options-this-side) * var(--option-height)));
          --gap-size: calc(var(--total-gap-space) / var(--num-options-this-side));
          --step: calc(var(--option-height) + var(--gap-size));

          --h: calc(
            /* edge gap: (H - N*h) / (2N) */
            (var(--total-gap-space) / (2 * var(--num-options-this-side)))
            +
            /* half item height */
            (var(--option-height) / 2)
            +
            /* (index-1) * step */
            ((var(--index) - 1) * var(--step))
            +
            /* odd-N correction: mod(N,2) * step/2 */
            (mod(var(--num-options-this-side), 2) * var(--step) / 2)
          );
          height: var(--h);
        }
      }


      .options-container {
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        border: 2px dashed #e63946;
        container-name: dial-options;

        flex: 1;
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
      position: relative;
    }

    .knob-container {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;

      .knob-temp {
        border: 2px dotted #457b9d;
        position: absolute;
        outline-width: 1cqi;

        --w: calc(100cqi * 2 / 3);
        /* width: var(--w); */
        aspect-ratio: 1 / 1;

        top: 50%;
        left: 50%;

        /* 1-based indexing assumed */
        --is-left: clamp(0, 1, calc(var(--left-count) - var(--selected-index) + 1));
        --is-right: clamp(0, 1, calc(var(--selected-index) - var(--left-count)));

        --num-options-active-side: calc(var(--is-left) * var(--left-count) + var(--is-right) * var(--right-count));
        --N-safe: max(1, var(--num-options-active-side));

        --total-gap-space: calc(var(--component-height) - (var(--num-options-active-side) * var(--option-height)));
        --gap-size: calc(var(--total-gap-space) / var(--N-safe));
        --step: calc(var(--option-height) + var(--gap-size));

        --h: calc(
          (var(--total-gap-space) / (2 * var(--N-safe)))
          + (var(--option-height) / 2)
          + ((var(--selected-index) - 1) * var(--step))
          + ((var(--is-left) * var(--left-is-odd) + var(--is-right) * var(--right-is-odd)) * var(--step) / 2)
        );

        height: var(--h);
        /* --angle: atan2(var(--h), var(--w)); */
        --angle: atan2(var(--h), 1);
        transform: translate(-50%, -50%) rotate(var(--angle));
        transform-origin: center center;

        &::before {
          content: 'Angle: ' var(--angle);
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.9);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          color: #333;
          white-space: nowrap;
          z-index: 10;
        }

        &::after {
          content: '';
          position: absolute;
          width: 8px;
          height: 50%;
          top: 50%;
          left: 50%;
          transform: translateX(-50%);
          background: teal;
          clip-path: polygon(
            /* Shaft of arrow */
            40% 0, 60% 0, 60% 85%,
            /* Arrowhead */
            100% 85%, 50% 100%, 0% 85%,
            /* Back to shaft */
            40% 85%
          );
        }
      }
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
