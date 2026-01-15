fn main() {
    println!("cargo:rerun-if-changed=resources/syntaxes");
    println!("cargo:rerun-if-changed=resources/themes");
    println!("cargo:rerun-if-changed=src/types");
}
