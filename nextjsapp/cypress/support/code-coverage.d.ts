declare module '@cypress/code-coverage/task' {
  const task: (on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) => Cypress.PluginConfigOptions;
  export default task;
}

declare module '@cypress/code-coverage/support';
