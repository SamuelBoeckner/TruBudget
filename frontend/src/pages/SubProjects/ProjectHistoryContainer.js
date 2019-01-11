import React, { Component } from "react";
import { connect } from "react-redux";
import { fromJS } from "immutable";

import sortBy from "lodash/sortBy";

import ResourceHistory from "../Common/History/ResourceHistory";
import { hideHistory } from "../Notifications/actions";
import strings from "../../localizeStrings";
import { toJS, formatString, formatUpdateString } from "../../helper";
import { formatPermission } from "../Common/History/helper";
import { fetchProjectHistory, setProjectHistoryOffset, setProjectHistoryHasMoreItems } from "./actions";

const calculateHistory = items => {
  return sortBy(
    items.reduce((acc, item) => {
      return acc.concat(item);
    }, []),
    "createdAt"
  ).reverse();
};

const mapIntent = ({ createdBy, intent, data, snapshot }) => {
  switch (intent) {
    case "global.createProject":
      return formatString(strings.history.project_create, createdBy, snapshot.displayName);
    case "project.intent.grantPermission":
      return formatString(strings.history.project_grantPermission, createdBy, formatPermission(data), data.identity);
    case "project.intent.revokePermission":
      return formatString(strings.history.project_revokePermission, createdBy, formatPermission(data), data.identity);
    case "project.createSubproject":
      return formatString(strings.history.project_createSubproject, createdBy, snapshot.displayName);
    case "project.assign":
      return formatString(strings.history.project_assign, createdBy, snapshot.displayName, data.identity);
    case "subproject.assign":
      return formatString(strings.history.subproject_assign, createdBy, snapshot.displayName, data.identity);
    case "subproject.close":
      return formatString(strings.history.subproject_close, createdBy, snapshot.displayName);
    case "subproject.intent.grantPermission":
      return formatString(
        strings.history.subproject_grantPermission_details,
        createdBy,
        formatPermission(data),
        data.identity,
        snapshot.displayName
      );
    case "project.update":
      return formatUpdateString(strings.common.project, createdBy, data);
    case "subproject.update":
      return formatUpdateString(strings.common.subproject, createdBy, data);
    case "subproject.intent.revokePermission":
      return formatString(
        strings.history.subproject_revokePermission_details,
        createdBy,
        formatPermission(data),
        data.identity,
        snapshot.displayName
      );
    default:
      console.log("WARN: Intent not defined:", intent);
      return intent;
  }
};

class ProjectHistoryContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      resourceHistory: fromJS([]),
      items: fromJS([])
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    // only calculate if history is shown and workflow state changed
    if (nextProps.show && nextProps.items !== prevState.items) {
      const resourceHistory = calculateHistory(nextProps.items);
      return {
        items: nextProps.items,
        resourceHistory
      };
    } else {
      return {
        ...prevState
      };
    }
  }

  fetchNextHistoryItems = () => {
    const newOffset = this.props.offset + this.props.limit;
    this.props.fetchProjectHistory(this.props.projectId, newOffset, this.props.limit)
  };

  render() {
    return <ResourceHistory fetchNextHistoryItems={this.fetchNextHistoryItems} isLoading={this.state.isLoading} resourceHistory={this.state.resourceHistory} mapIntent={mapIntent}  {...this.props} />;
  }
}

const mapStateToProps = state => {
  return {
    items: state.getIn(["detailview", "historyItems"]),
    historyItemsCount: state.getIn(["detailview", "historyItemsCount"]),
    show: state.getIn(["notifications", "showHistory"]),
    isLoading: state.getIn(["detailview", "isHistoryLoading"]),
  };
};
const mapDispatchToProps = dispatch => {
  return {
    close: () => dispatch(hideHistory()),
    setProjectHistoryOffset: offset => dispatch(setProjectHistoryOffset(offset)),
    fetchProjectHistory: (projectId, offset, limit) => dispatch(fetchProjectHistory(projectId, offset, limit, false)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(toJS(ProjectHistoryContainer));
