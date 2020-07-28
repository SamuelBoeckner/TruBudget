import React, { Component } from "react";
import { connect } from "react-redux";
import SubprojectDialog from "./SubprojectDialog";
import withInitialLoading from "../Loading/withInitialLoading";
import { toJS } from "../../helper";
import {
  hideSubprojectDialog,
  storeSubProjectName,
  createSubProject,
  editSubproject,
  storeSubProjectComment,
  storeSubProjectCurrency,
  storeSubProjectProjectedBudgets,
  storeDeletedProjectedBudget
} from "./actions";
import { storeBudgetAmount, storeBudgetAmountEdit, storeOrganization } from "../Overview/actions";
import { storeSnackbarMessage } from "../Notifications/actions";

class SubprojectDialogContainer extends Component {
  render() {
    return <SubprojectDialog {...this.props} />;
  }
}

const mapStateToProps = state => {
  return {
    subprojectToAdd: state.getIn(["detailview", "subprojectToAdd"]),
    creationDialogShown: state.getIn(["detailview", "creationDialogShown"]),
    editDialogShown: state.getIn(["detailview", "editDialogShown"]),
    subProjects: state.getIn(["detailview", "subProjects"]),
    dialogTitle: state.getIn(["detailview", "dialogTitle"]),
    projectProjectedBudgets: state.getIn(["detailview", "projectProjectedBudgets"]),
    budgetAmount: state.getIn(["overview", "budgetAmount"]),
    budgetAmountEdit: state.getIn(["overview", "budgetAmountEdit"]),
    organization: state.getIn(["overview", "organization"])
  };
};

const mapDispatchToProps = dispatch => {
  return {
    hideSubprojectDialog: () => dispatch(hideSubprojectDialog()),
    storeSubProjectName: name => dispatch(storeSubProjectName(name)),
    createSubProject: (subprojectName, description, currency, parentName, projectedBudget) =>
      dispatch(createSubProject(parentName, subprojectName, description, currency, projectedBudget)),
    editSubproject: (pId, sId, changes, deletedBudgets) => dispatch(editSubproject(pId, sId, changes, deletedBudgets)),
    storeSubProjectComment: comment => dispatch(storeSubProjectComment(comment)),
    storeSubProjectCurrency: currency => dispatch(storeSubProjectCurrency(currency)),
    storeSubProjectProjectedBudgets: projectedBudgets => dispatch(storeSubProjectProjectedBudgets(projectedBudgets)),
    storeSnackbarMessage: message => dispatch(storeSnackbarMessage(message)),
    storeDeletedProjectedBudget: projectedBudgets => dispatch(storeDeletedProjectedBudget(projectedBudgets)),
    storeBudgetAmount: budgetAmount => dispatch(storeBudgetAmount(budgetAmount)),
    storeBudgetAmountEdit: budgetAmountEdit => dispatch(storeBudgetAmountEdit(budgetAmountEdit)),
    storeOrganization: organization => dispatch(storeOrganization(organization))
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(withInitialLoading(toJS(SubprojectDialogContainer)));
