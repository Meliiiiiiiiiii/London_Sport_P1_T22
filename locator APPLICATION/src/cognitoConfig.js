import { CognitoUserPool } from "amazon-cognito-identity-js";

export const userPool = new CognitoUserPool({
  UserPoolId: "eu-north-1_3M1BWmGCa",
  ClientId: "6la1uqbd6lm2m9hpf8223m4v23",
});