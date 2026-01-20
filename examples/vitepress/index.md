---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "My Awesome Project"
  text: "A VitePress Site"
  tagline: My great project tagline
  actions:
    - theme: brand
      text: Markdown Examples
      link: /markdown-examples
    - theme: alt
      text: API Examples
      link: /api-examples

features:
  - title: Feature A
    details: Lorem ipsum dolor sit amet, consectetur adipiscing elit
  - title: Feature B
    details: Lorem ipsum dolor sit amet, consectetur adipiscing elit
  - title: Feature C
    details: Lorem ipsum dolor sit amet, consectetur adipiscing elit
---

::: code-group

```dart canary [Entrypoint]
import 'package:serinus/serinus.dart';
import 'module.dart';

extension App on SerinusFactory {}

Future<void> main() async {
  final app = await serinus.createApplication(
//                          ^?
    entrypoint: AppModule(),
  );
// ---cut-start---
  await app.serve();
// ---cut-end---
}
```

```dart canary [Entrypoint]
class AppModule extends Module {
  AppModule() : super(
//                ^?
    controllers: [AppController()],
  );
}
```

```dart canary [Module]
import 'package:serinus/serinus.dart';

class AppController extends Controller {
  AppController() : super('/') {
    on(Route.get('/'), _handleHelloWorld);
  }

  String _handleHelloWorld(RequestContext context) {
    return 'Hello, World!';
  }
}
```


:::

```ts twoslash
// @errors: 2554 2339
class Animal {
  name: string;
  constructor(name: string) {
    this.name = name;
//       ^?
  }

  bark(): void {
    console.log(`Woof! ${this.name}`);
  }

}
class Dog extends Animal {
  set bar(value: boolean) {
      // do nothing
  }
  get bar(): boolean {
      return true;
  }
  constructor(name: string) {
    super(name);
    console.log(name);
  }
}
const myDog = new Dog("Buddy", "Golden Retriever");
myDog.breed;

function getDogBreed(dog: Dog) {
  return dog.name;
}
```