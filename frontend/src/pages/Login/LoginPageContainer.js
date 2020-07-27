import React, { Component } from "react";
import { connect } from "react-redux";
import {
  checkEmailService,
  getEnvironment,
  initLanguage,
  loginWithCredentials,
  logout,
  setLanguage,
  storeEnvironment,
  storePassword,
  storeUsername
} from "./actions";
import { storeSnackbarMessage, hideSnackbar } from "../Notifications/actions";
import LoginPage from "./LoginPage";

class LoginPageContainer extends Component {
  componentDidMount() {
    this.props.initLanguage();
    this.props.getEnvironment();
    this.checkIfRedirect();
    // window.injectedEnv exists when deploying via docker and nginx
    // process.env exists when using node.js
    if (
      window.injectedEnv.REACT_APP_EMAIL_SERVICE_ENABLED === "true" ||
      process.env.REACT_APP_EMAIL_SERVICE_ENABLED === "true"
    ) {
      this.props.checkEmailService();
    }
  }

  componentDidUpdate() {
    this.checkIfRedirect();
  }

  checkIfRedirect() {
    const from = this.props.location && this.props.location.state && this.props.location.state.from;
    const path = from ? this.props.location.state.from : "/";

    if (this.props.jwt) this.props.history.push(path);
  }

  render() {
    return <LoginPage {...this.props} />;
  }
}

const mapDispatchToProps = dispatch => {
  return {
    initLanguage: () => dispatch(initLanguage()),
    storeUsername: username => dispatch(storeUsername(username)),
    storePassword: password => dispatch(storePassword(password)),
    logout: () => dispatch(logout()),
    loginWithCredentials: (username, password) => dispatch(loginWithCredentials(username, password)),
    storeEnvironment: environment => dispatch(storeEnvironment(environment)),
    getEnvironment: () => dispatch(getEnvironment()),
    setLanguage: language => dispatch(setLanguage(language)),
    checkEmailService: () => dispatch(checkEmailService()),
    storeSnackbarMessage: message => dispatch(storeSnackbarMessage(message)),
    closeSnackbar: () => dispatch(hideSnackbar())
  };
};

const mapStateToProps = state => {
  return {
    username: state.getIn(["login", "username"]),
    jwt: state.getIn(["login", "jwt"]),
    password: state.getIn(["login", "password"]),
    loginUserError: state.getIn(["login", "loginUserError"]),
    loginDataError: state.getIn(["login", "loginDataError"]),
    loginActivationError: state.getIn(["login", "loginActivationError"]),
    environment: state.getIn(["login", "environment"]),
    language: state.getIn(["login", "language"]),
    showSnackbar: state.getIn(["notifications", "showSnackbar"]),
    snackbarMessage: state.getIn(["notifications", "snackbarMessage"]),
    snackbarError: state.getIn(["notifications", "snackbarError"]),
    snackbarWarning: state.getIn(["notifications", "snackbarWarning"])
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(LoginPageContainer);
