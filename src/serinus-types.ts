import { defineCustomTypes } from './define-types'

/**
 * Custom types for Serinus framework documentation.
 * Import this in config.mts and pass to dartInspectTransformer.
 */
export const serinusTypes = defineCustomTypes({
  types: [
    // Core types
    {
      name: 'SerinusApplication',
      description: 'The main application class that bootstraps and runs the server.',
      members: {
        serve: { type: 'Future<void>', description: 'Starts the HTTP server.', parameters: []},
        use: { type: 'void', description: 'Registers a global middleware or hook.', parameters: [{
          type: 'Processable',
          name: 'processable',
          description: 'The middleware or hook to register.',
          kind: 'positional',
        }] },
      },
    },
    {
      name: 'serinus',
      description: 'Factory class for creating a Serinus application instance.',
      staticMembers: {
        createApplication: { type: 'SerinusApplication', description: 'Creates a new Serinus application.' },
      },
    },
    {
      name: 'Module',
      description: 'A class that organizes controllers, providers, and imports.',
      members: {
        controllers: 'List<Controller>',
        providers: 'List<Provider>',
        imports: 'List<Module>',
        exports: 'List<Type>',
      },
      constructors: [
        {
          name: 'Module',
          description: 'Creates a new Module instance.',
          parameters: [
            { type: 'List<Controller>', name: 'controllers', description: 'The controllers to include in this module.', kind: 'named', defaultValue: 'const []' },
            { type: 'List<Provider>', name: 'providers', description: 'The providers to include in this module.', kind: 'named', defaultValue: 'const []' },
            { type: 'List<Module>', name: 'imports', description: 'Other modules to import.', kind: 'named', defaultValue: 'const []' },
            { type: 'List<Type>', name: 'exports', description: 'Types to export from this module.', kind: 'named', defaultValue: 'const []' },
          ]
        }
      ],
    },
    {
      name: 'watchValue',
      description: 'Creates a reactive value that notifies listeners on changes.',
      kind: 'function',
      typeParameters: ['T', 'R'],
      returnType: 'R',
      parameters: [
        { type: 'R Function(T)', name: 'selectProperty', description: 'A function that maps the value to a derived value.', kind: 'positional' },
        { type: 'bool', name: 'allowObservableChange', description: 'Whether to allow changes from observable sources.', kind: 'named', defaultValue: 'false' },
        { type: 'String?', name: 'instanceName', description: 'An optional label for debugging purposes.', kind: 'named' },
      ],
    },
    {
      name: 'GetIt',
      description: 'A simple service locator for dependency injection.',
      staticMembers: {
        instance: { type: 'GetIt', description: 'The singleton instance of GetIt.' },
        registerSingleton: { 
          type: 'T', 
          description: 'Registers a singleton instance of a type.', 
          parameters: [
            { type: 'T', name: 'instance', description: 'The instance to register.', kind: 'positional' },
            { type: 'String?', name: 'instanceName', description: 'An optional name for the instance.', kind: 'named' },
            { type: 'bool?', name: 'signalsReady', description: 'Whether the instance is ready for use.', kind: 'named' },
            { type: 'FutureOr Function(T param)?', name: 'dispose', kind: 'named' },
          ]
        },
      },
      kind: 'class'
    },
    {
      name: 'ListNotifier',
      description: 'A notifier that holds a list of items and notifies listeners on changes.',
      typeParameters: ['T'],
      members: {
        add: { type: 'void', description: 'Adds an item to the list.', parameters: [
          { type: 'T', name: 'item', description: 'The item to add.', kind: 'positional' },
        ]},
        remove: { type: 'void', description: 'Removes an item from the list.', parameters: [
          { type: 'T', name: 'item', description: 'The item to remove.', kind: 'positional' },
        ]},
        clear: { type: 'void', description: 'Clears all items from the list.', parameters: []},
      },
      constructors: [
        {
          name: 'ListNotifier',
          description: 'Creates a new ListNotifier instance.',
          parameters: [
            { type: 'List<T>', name: 'initialItems', description: 'The initial items in the list.', kind: 'named', defaultValue: 'const []' },
          ]
        }
      ],
      kind: 'class'
    },
    {
      name: 'CounterModel',
      description: 'A simple model class for managing a counter state.',
      members: {
        count: 'int',
        increment: { type: 'void', description: 'Increments the counter by one.', parameters: []},
        decrement: { type: 'void', description: 'Decrements the counter by one.', parameters: []},
      },
      constructors: [
        {
          name: 'CounterModel',
          description: 'Creates a new CounterModel instance.',
          parameters: []
        }
      ],
      kind: 'class'
    },
    {
      name: 'Text',
      description: 'A simple text widget for displaying strings.',
      constructors: [
        {
          name: 'Text',
          description: 'Creates a new Text widget instance.',
          parameters: [
            { type: 'String', name: 'data', description: 'The string to display.', kind: 'positional' },
          ]
        }
      ],
      kind: 'class'
    },
    {
      name: 'Controller',
      description: 'Base class for route controllers that handle HTTP requests.',
      members: {
        path: { type: 'String', description: 'The base path for all routes in this controller.' },
      },
    },
    {
      name: 'Provider',
      description: 'A service that can be injected into controllers and other providers.',
      typeParameters: ['T'],
      members: {
        getBitch: { type: 'T', description: 'Retrieves a dependency from the container.', parameters: [
          { type: 'T', name: 'bitch', description: 'The type of the dependency to retrieve.', kind: 'positional' },
        ]},
      },
    },
    
    // Request/Response
    {
      name: 'Request',
      description: 'Represents an incoming HTTP request.',
      members: {
        method: 'String',
        path: 'String',
        uri: 'Uri',
        headers: 'Map<String, String>',
        body: { type: 'dynamic', description: 'The parsed request body.' },
        query: { type: 'Map<String, String>', description: 'Query parameters from the URL.' },
        params: { type: 'Map<String, String>', description: 'Path parameters from the route.' },
      },
    },
    {
      name: 'Response',
      description: 'Represents an HTTP response to send to the client.',
      members: {
        statusCode: 'int',
        headers: 'Map<String, String>',
        body: 'dynamic',
      },
      staticMembers: {
        json: { type: 'Response', description: 'Creates a JSON response.' },
        text: { type: 'Response', description: 'Creates a plain text response.' },
        html: { type: 'Response', description: 'Creates an HTML response.' },
        redirect: { type: 'Response', description: 'Creates a redirect response.' },
      },
    },
    {
      name: 'RequestContext',
      description: 'Context object available in route handlers.',
      members: {
        request: 'Request',
        params: 'Map<String, String>',
        query: 'Map<String, String>',
        body: 'dynamic',
      },
    },
    
    // Decorators (represented as types for hover)
    {
      name: 'Get',
      description: 'Decorator for HTTP GET routes.',
    },
    {
      name: 'Post',
      description: 'Decorator for HTTP POST routes.',
    },
    {
      name: 'Put',
      description: 'Decorator for HTTP PUT routes.',
    },
    {
      name: 'Delete',
      description: 'Decorator for HTTP DELETE routes.',
    },
    {
      name: 'Patch',
      description: 'Decorator for HTTP PATCH routes.',
    },
    
    // Middleware & Hooks
    {
      name: 'Middleware',
      description: 'Base class for request/response middleware.',
      members: {
        handle: { type: 'Future<void>', description: 'Processes the request before or after the handler.' },
      },
    },
    {
      name: 'Hook',
      description: 'Lifecycle hook for intercepting application events.',
      members: {
        onRequest: 'Future<void>',
        onResponse: 'Future<void>',
      },
    },
    
    // WebSocket
    {
      name: 'WebSocketGateway',
      description: 'Gateway for handling WebSocket connections.',
      members: {
        onConnect: 'Future<void>',
        onDisconnect: 'Future<void>',
        onMessage: 'Future<void>',
      },
    },
    {
      name: 'WebSocketClient',
      description: 'Represents a connected WebSocket client.',
      members: {
        id: 'String',
        send: { type: 'void', description: 'Sends a message to this client.' },
        close: { type: 'Future<void>', description: 'Closes the connection.' },
      },
    },
    {
      name: 'ShadAccordion',
      description: 'A widget that displays a list of expandable accordion items.',
      typeParameters: ['T'],
      constructors: [
        {
          name: 'ShadAccordion',
          description: 'Creates a new ShadAccordion instance.',
          parameters: [
            { type: 'List<ShadAccordionItem<T>>', name: 'children', description: 'The list of accordion items.', kind: 'named', required: true, },
          ],
          typeParameters: ['T'],
        }
      ]
    },
    {
      name: 'ShadAccordionItem',
      description: 'An item within a ShadAccordion component.',
      typeParameters: ['T'],
      constructors: [
        {
          name: 'ShadAccordionItem',
          description: 'Creates a new ShadAccordionItem instance.',
          parameters: [
            { type: 'T', name: 'value', description: 'The value of the accordion item.', kind: 'named', required: true },
            { type: 'Widget', name: 'title', description: 'The title widget of the accordion item.', kind: 'named', required: true },
            { type: 'Widget', name: 'child', description: 'The content widget of the accordion item.', kind: 'named', required: true },
          ],
          typeParameters: ['T']
        }
      ]
    }
  ],
})
