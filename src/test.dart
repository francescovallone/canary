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

typedef StringCallback<T> = String Function(T name);
typedef void VoidCallback();
typedef IntMapper<T> = T Function(int value);

class Animal<T> {
  final String species;

  const Animal({this.species = 'Unknown'});

  T makeSound(T value) {
    print("Some generic animal sound");
    return value;
  }
}

/// A Dog class that extends Animal
class Dog extends Animal {
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


void main() {
  final myDog = Dog(
    (String name) {
      return name;
    }, 
    species: 'Canine'
  );
  (data) {
    print(data);
  };
  final result = myDog.name;
  print('Dog name: $result');
  myDog.makeSound('Woof! Woof!');
  
  // Using top-level functions
  final barkSound = bark('Hello');
  final doubled = doubleValue(21);
  final v = List.generate();
  
details.map((detail) {
  print('${detail.title}\n${detail.content}\n');
});
}