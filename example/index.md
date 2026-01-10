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


```dart
const dartExample = '';

// Custom type definitions
typedef StringCallback<T> = String Function(T name);
typedef void VoidCallback();
typedef IntMapper<T> = T Function(int value);

class Animal<T> {
  final Owner species;

  const Animal({this.species});

  T makeSound(T value) {
    print("Some generic animal sound");
    return value;
  }
}

/// A Dog class that extends Animal
class Dog extends Animal<String> {
  StringCallback<String> name;

  Dog(this.name, {super.species});

}

// Top-level functions
String bark(String sound) {
  return "Woof! Woof! $sound";
}

double doubleValue(int x) {
  return x * 2;
}

class Owner {
  final String ownerName;

  Owner(this.ownerName);
}


void main() {
  final animal = Animal<String>(species: Owner('Generic Species'));
  final myDog = Dog(
    (String name) {
      return name;
    }, 
    species: 'Canine'
  );
  (String data) {
    print(data);
  };
  final result = myDog.name;
  print('Dog name: $result');
  final value = myDog.makeSound('Woof! Woof!');
  
  // Using top-level functions
  final barkSound = bark('Hello');
  final doubled = doubleValue(21);
}
```

```dart
// Top-level functions
int bark(String sound) {
  return sound.length;
}
```

```dart canary
final details = [
  (
    title: 'Is it acceptable?',
    content: 'Yes. It adheres to the WAI-ARIA design pattern.',
  ),
  (
    title: 'Is it styled?',
    content:
        "Yes. It comes with default styles that matches the other components' aesthetic.",
  ),
  (
    title: 'Is it animated?',
    content:
        "Yes. It's animated by default, but you can disable it if you prefer.",
  ),
];

@override
Widget build(BuildContext context) {
  return ShadAccordion<({String content, String title})>(
    children: details.map(
      (detail) => ShadAccordionItem(
        value: detail,
        title: Text(detail.title),
        child: Text(detail.content),
      ),
    ),
  );
}
```

```ts twoslash
// @errors: 2554 2339
class Animal {
  name: string;
  constructor(name: string) {
    this.name = name;
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