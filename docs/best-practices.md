# Best Practices

## Naming Things

| Thing     | Example(s)                 | Guidelines                                           |
|:----------|:---------------------------|:-----------------------------------------------------|
| Component | `UserActivation`           | Singular noun of the process, Pascal-case            |
| Category  | `userActivation`           | Camel-case of the component name                     |
| Entity    | `UserActivation`           | Same as the component, unless you need more than one |
| Command   | `Activate`, `Deactivate`   | Imperative verb, no object                           |
| Event     | `Activated`, `Deactivated` | Past-tense verb, no object                           |

## Idempotence Patterns
