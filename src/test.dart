const dartExample = '';

class Animal {
  final String species;

  static data() => 'Dart Example';

  const Animal({this.species = 'Unknown'});

  void makeSound() {
    print("Some generic animal sound");
  }
}

/// A Dog class that extends Animal
class Dog extends Animal {
  String name;

  Dog(this.name, {super.species}) : super(species: species);

  @override
  void makeSound() {
    print("Woof! Woof!");
  }
}
String bark(String sound) {
    return "Woof! Woof! $sound";
  }


void main() {
  final myDog = Dog("Buddy", '');
  final result = myDog.name;
  print('Dog name: $result');
  myDog.bark();
}