declare module "bcryptjs" {
  const bcrypt: {
    genSaltSync(rounds?: number): string;
    hashSync(plain: string, salt: string | number): string;
    compareSync(plain: string, hashed: string): boolean;
  };
  export default bcrypt;
}
