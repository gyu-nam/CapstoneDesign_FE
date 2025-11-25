import { createRouter, createWebHistory } from 'vue-router'
import HeaderView from '../components/HeaderView.vue'
import LoginView from '../components/LoginView.vue'
import SignupView from '../components/SignupView.vue'
import ForgetPW from '../components/ForgetPW'
import GotoPW from '../components/GotoPW'
import MainView from '../components/MainView.vue'
import AdminPage from '../components/AdminPage.vue'
import TransactionTable from '../components/TransactionTable.vue'
import PopupView from '../components/PopUpView.vue'
import ModalView from '../components/ModalView.vue'
import makeToledger from '../components/makeToledger.vue'
import GroupPW from '../components/GroupPW.vue'


const routes = [
  {
    path: '/',
    name: 'MainView',
    component: MainView
  },
  {
    path: '/makeToledger',
    name: 'makeToledger',
    component: makeToledger
  },
  {
    path: '/GroupPW',
    name: 'GroupPW',
    component: GroupPW
  },
  {
    path: '/ModalView',
    name: 'ModalView',
    component: ModalView
  },
  {
    path: '/PopupView',
    name: 'PopupView',
    component: PopupView
  },
   {
    path: '/TransactionTable',
    name: 'TransactionTable',
    component: TransactionTable,
    props: true
  },
  {
    path: '/HeaderView',
    name: 'HeaderView',
    component: HeaderView
  },
   {
    path: '/AdminPage',
    name: 'AdminPage',
    component: AdminPage
  },
  {
    path: '/login',
    name: 'LoginView',
    component: LoginView
  },
  {
    path: '/SignupView',
    name: 'SignupView',
    component: SignupView
  },
   {
    path: '/ForgetPW',
    name: 'ForgetPW',
    component: ForgetPW
  },
   {
    path: '/GotoPW',
    name: 'GotoPW',
    component: GotoPW
  },
  {
    path: '/about',
    name: 'about',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/AboutView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
