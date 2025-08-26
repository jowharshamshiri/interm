import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const mouseTools: Tool[] = [
  {
    name: 'mouse_move',
    description: 'Move mouse cursor to specific coordinates',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        x: {
          type: 'number',
          description: 'X coordinate (column) in terminal',
          minimum: 0
        },
        y: {
          type: 'number',
          description: 'Y coordinate (row) in terminal',
          minimum: 0
        },
        relative: {
          type: 'boolean',
          description: 'Whether coordinates are relative to current position',
          default: false
        },
        smooth: {
          type: 'boolean',
          description: 'Whether to animate movement smoothly',
          default: false
        },
        duration: {
          type: 'number',
          description: 'Duration of smooth movement in milliseconds',
          default: 200,
          minimum: 10,
          maximum: 2000
        }
      },
      required: ['sessionId', 'x', 'y']
    }
  },
  {
    name: 'mouse_click',
    description: 'Perform mouse click at current or specified position',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        button: {
          type: 'string',
          description: 'Mouse button to click',
          enum: ['left', 'right', 'middle', 'x1', 'x2'],
          default: 'left'
        },
        x: {
          type: 'number',
          description: 'X coordinate (optional, uses current if not specified)',
          minimum: 0
        },
        y: {
          type: 'number',
          description: 'Y coordinate (optional, uses current if not specified)',
          minimum: 0
        },
        clickCount: {
          type: 'number',
          description: 'Number of clicks (1=single, 2=double, 3=triple, etc.)',
          default: 1,
          minimum: 1,
          maximum: 10
        },
        modifiers: {
          type: 'array',
          description: 'Modifier keys held during click',
          items: {
            type: 'string',
            enum: ['ctrl', 'alt', 'shift', 'meta']
          }
        },
        pressure: {
          type: 'number',
          description: 'Click pressure (0.0-1.0) for pressure-sensitive devices',
          minimum: 0.0,
          maximum: 1.0,
          default: 0.5
        }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'mouse_drag',
    description: 'Perform click and drag operation',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        startX: {
          type: 'number',
          description: 'Starting X coordinate',
          minimum: 0
        },
        startY: {
          type: 'number',
          description: 'Starting Y coordinate',
          minimum: 0
        },
        endX: {
          type: 'number',
          description: 'Ending X coordinate',
          minimum: 0
        },
        endY: {
          type: 'number',
          description: 'Ending Y coordinate',
          minimum: 0
        },
        button: {
          type: 'string',
          description: 'Mouse button to use for dragging',
          enum: ['left', 'right', 'middle'],
          default: 'left'
        },
        dragThreshold: {
          type: 'number',
          description: 'Minimum distance to initiate drag',
          default: 3,
          minimum: 1,
          maximum: 20
        },
        smooth: {
          type: 'boolean',
          description: 'Whether to animate drag smoothly',
          default: true
        },
        duration: {
          type: 'number',
          description: 'Duration of drag operation in milliseconds',
          default: 500,
          minimum: 100,
          maximum: 5000
        }
      },
      required: ['sessionId', 'startX', 'startY', 'endX', 'endY']
    }
  },
  {
    name: 'mouse_scroll',
    description: 'Perform mouse wheel scrolling',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        direction: {
          type: 'string',
          description: 'Scroll direction',
          enum: ['up', 'down', 'left', 'right']
        },
        amount: {
          type: 'number',
          description: 'Amount to scroll (positive number)',
          default: 3,
          minimum: 1,
          maximum: 100
        },
        x: {
          type: 'number',
          description: 'X coordinate for scroll center',
          minimum: 0
        },
        y: {
          type: 'number',
          description: 'Y coordinate for scroll center',
          minimum: 0
        },
        precision: {
          type: 'boolean',
          description: 'Use precision scrolling (pixel-level)',
          default: false
        },
        pixelDelta: {
          type: 'number',
          description: 'Pixel delta for precision scrolling',
          minimum: 1,
          maximum: 1000
        }
      },
      required: ['sessionId', 'direction']
    }
  },
  {
    name: 'mouse_hover',
    description: 'Hover mouse over specific position with timing',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        x: {
          type: 'number',
          description: 'X coordinate to hover over',
          minimum: 0
        },
        y: {
          type: 'number',
          description: 'Y coordinate to hover over',
          minimum: 0
        },
        duration: {
          type: 'number',
          description: 'Duration to hover in milliseconds',
          default: 1000,
          minimum: 100,
          maximum: 10000
        },
        waitForTooltip: {
          type: 'boolean',
          description: 'Wait for tooltip to appear',
          default: false
        },
        tooltipTimeout: {
          type: 'number',
          description: 'Maximum time to wait for tooltip (ms)',
          default: 2000,
          minimum: 100,
          maximum: 10000
        }
      },
      required: ['sessionId', 'x', 'y']
    }
  },
  {
    name: 'mouse_gesture',
    description: 'Perform complex mouse gestures and patterns',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        gestureType: {
          type: 'string',
          description: 'Type of gesture to perform',
          enum: [
            'swipe_left', 'swipe_right', 'swipe_up', 'swipe_down',
            'circle_clockwise', 'circle_counterclockwise',
            'zigzag_horizontal', 'zigzag_vertical',
            'figure_eight', 'cross', 'triangle', 'square'
          ]
        },
        startX: {
          type: 'number',
          description: 'Starting X coordinate',
          minimum: 0
        },
        startY: {
          type: 'number',
          description: 'Starting Y coordinate',
          minimum: 0
        },
        size: {
          type: 'number',
          description: 'Size/scale of the gesture',
          default: 50,
          minimum: 10,
          maximum: 500
        },
        speed: {
          type: 'number',
          description: 'Speed of gesture execution',
          enum: [1, 2, 3, 4, 5],
          default: 3
        },
        button: {
          type: 'string',
          description: 'Mouse button to use (if applicable)',
          enum: ['none', 'left', 'right', 'middle'],
          default: 'none'
        }
      },
      required: ['sessionId', 'gestureType', 'startX', 'startY']
    }
  },
  {
    name: 'mouse_multi_button',
    description: 'Press multiple mouse buttons simultaneously',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        buttons: {
          type: 'array',
          description: 'Mouse buttons to press simultaneously',
          items: {
            type: 'string',
            enum: ['left', 'right', 'middle', 'x1', 'x2']
          },
          minItems: 2,
          maxItems: 5
        },
        x: {
          type: 'number',
          description: 'X coordinate',
          minimum: 0
        },
        y: {
          type: 'number',
          description: 'Y coordinate',
          minimum: 0
        },
        holdDuration: {
          type: 'number',
          description: 'Duration to hold buttons in milliseconds',
          default: 100,
          minimum: 50,
          maximum: 5000
        }
      },
      required: ['sessionId', 'buttons']
    }
  },
  {
    name: 'get_mouse_position',
    description: 'Get current mouse cursor position',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        coordinateSystem: {
          type: 'string',
          description: 'Coordinate system to use',
          enum: ['terminal', 'screen', 'window'],
          default: 'terminal'
        }
      },
      required: ['sessionId']
    }
  }
];