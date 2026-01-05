class Dog {
  final String name;

  const Dog(this.name, color);

  void bark() {
    print("Woof! Woof!");
  }
}

getDogBreed(Dog dog) {
  return dog.name;
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