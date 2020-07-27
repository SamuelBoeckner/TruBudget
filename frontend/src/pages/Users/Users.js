import AppBar from "@material-ui/core/AppBar";
import Fab from "@material-ui/core/Fab";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import Add from "@material-ui/icons/Add";
import React from "react";

import strings from "../../localizeStrings";
import DialogContainer from "./DialogContainer";
import GroupTable from "./GroupTable";
import UsersTable from "./UsersTable";

const styles = {
  container: {
    width: "100%",
    display: "flex",
    justifyContent: "center"
  },
  customWidth: {
    width: "90%",
    marginTop: "40px"
  },
  createButtonContainer: {
    display: "flex",
    flexDirection: "column",
    position: "absolute",
    alignItems: "center",
    top: "80px",
    right: "-20px",
    width: "30%",
    height: 20
  },
  createButton: {
    position: "absolute",
    marginTop: -20
  }
};
const Users = props => {
  const {
    tabIndex,
    setTabIndex,
    showDashboardDialog,
    allowedIntents,
    isDataLoading,
    enabledUsers,
    disabledUsers
  } = props;
  const isEnabledUserTab = tabIndex === 0;
  const isGroupTab = tabIndex === 1;
  const isDisabledUserTab = tabIndex === 2;
  let isCreateButtonDisabled = true;
  if (isEnabledUserTab) {
    isCreateButtonDisabled = !allowedIntents.includes("global.createUser");
  } else if (isGroupTab) {
    isCreateButtonDisabled = !allowedIntents.includes("global.createGroup");
  }
  const onClick = () => (isEnabledUserTab ? showDashboardDialog("addUser") : showDashboardDialog("addGroup"));
  const permissionIconDisplayed = allowedIntents.includes("global.listPermissions");

  return (
    <div data-test="userdashboard" style={styles.container}>
      <div style={styles.customWidth}>
        <AppBar position="static" color="default">
          <Tabs
            value={tabIndex}
            onChange={(_, value) => setTabIndex(value)}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label={strings.users.users} aria-label="usersTab" data-test="usersTab" />
            <Tab label={strings.users.groups} aria-label="groupsTab" />
            <Tab label={strings.users.disabled_users} aria-label="disabledUsersTab" data-test="disabledUsersTab" />
          </Tabs>
        </AppBar>
        {!isCreateButtonDisabled ? (
          <div style={styles.createButtonContainer}>
            <Fab
              disabled={isCreateButtonDisabled}
              data-test="create"
              onClick={onClick}
              color="primary"
              style={styles.createButton}
              aria-label="Add"
            >
              <Add />
            </Fab>
          </div>
        ) : null}
        {isEnabledUserTab && (
          <UsersTable
            {...props}
            permissionIconDisplayed={permissionIconDisplayed}
            users={enabledUsers}
            areUsersEnabled={true}
          />
        )}

        {isDataLoading ? <div /> : isGroupTab && <GroupTable {...props} />}

        {isDataLoading ? (
          <div />
        ) : (
          isDisabledUserTab && (
            <UsersTable
              {...props}
              permissionIconDisplayed={permissionIconDisplayed}
              users={disabledUsers}
              areUsersEnabled={false}
            />
          )
        )}
      </div>
      <DialogContainer {...props} />
    </div>
  );
};

export default Users;
