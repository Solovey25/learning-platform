import React from "react";
import { BrowserRouter as Router, Switch, Route, Redirect } from "react-router-dom";
import { AuthProvider } from "./contexts/auth-context";
import { ProtectedRoute } from "./components/protected-route";
import { AdminRoute } from "./components/admin-route";
import { Login } from "./pages/login";
import { Register } from "./pages/register";
import { Dashboard } from "./pages/dashboard";
import { CourseDetails } from "./pages/course-details";
import { ChapterContent } from "./pages/chapter-content";
import { ChapterQuiz } from "./pages/chapter-quiz";
import { AdminDashboard } from "./pages/admin/admin-dashboard";
import { AdminCourseCreate } from "./pages/admin/admin-course-create";
import { AdminCourseEdit } from "./pages/admin/admin-course-edit";
import { Profile } from "./pages/profile";
import { AdminUsers } from "./pages/admin/admin-users";
import { AdminAnalytics } from "./pages/admin/admin-analytics";
import { AdminCourseAnalytics } from "./pages/admin/admin-course-analytics";
import { AdminGroups } from "./pages/admin/admin-groups";
import { AdminGroupDetails } from "./pages/admin/admin-group-details";
import { AdminCourseAssignments } from "./pages/admin/admin-course-assignments";
import { AdminAssignmentSubmissions } from "./pages/admin/admin-assignment-submissions";
import { AdminAssignmentSubmissionDetails } from "./pages/admin/admin-assignment-submission-details";
import { Assignments } from "./pages/assignments";
import { AssignmentDetails } from "./pages/assignment-details";

function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Switch>
          <Route exact path="/login" component={Login} />
          <Route exact path="/register" component={Register} />
          <ProtectedRoute exact path="/dashboard" component={Dashboard} />
          <ProtectedRoute exact path="/assignments" component={Assignments} />
          <ProtectedRoute
            exact
            path="/assignments/:assignmentId"
            component={AssignmentDetails}
          />
          <ProtectedRoute exact path="/profile" component={Profile} />
          <ProtectedRoute exact path="/courses/:courseId" component={CourseDetails} />
          <ProtectedRoute
            exact
            path="/courses/:courseId/chapters/:chapterId"
            component={ChapterContent}
          />
          <ProtectedRoute
            exact
            path="/courses/:courseId/chapters/:chapterId/quiz"
            component={ChapterQuiz}
          />
          <AdminRoute exact path="/admin" component={AdminDashboard} />
          <AdminRoute exact path="/admin/users" component={AdminUsers} />
          <AdminRoute exact path="/admin/analytics" component={AdminAnalytics} />
          <AdminRoute
            exact
            path="/admin/analytics/courses/:courseId"
            component={AdminCourseAnalytics}
          />
          <AdminRoute exact path="/admin/groups" component={AdminGroups} />
          <AdminRoute
            exact
            path="/admin/groups/:groupId"
            component={AdminGroupDetails}
          />
          <AdminRoute exact path="/admin/courses/create" component={AdminCourseCreate} />
          <AdminRoute exact path="/admin/courses/:courseId/edit" component={AdminCourseEdit} />
          <AdminRoute
            exact
            path="/admin/courses/:courseId/assignments"
            component={AdminCourseAssignments}
          />
          <AdminRoute
            exact
            path="/admin/assignments/:assignmentId/submissions"
            component={AdminAssignmentSubmissions}
          />
          <AdminRoute
            exact
            path="/admin/assignments/:assignmentId/submissions/:submissionId"
            component={AdminAssignmentSubmissionDetails}
          />
          <Route exact path="/">
            <Redirect to="/dashboard" />
          </Route>
        </Switch>
      </AuthProvider>
    </Router>
  );
}

export default App;
