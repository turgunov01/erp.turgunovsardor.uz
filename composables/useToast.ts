import { reactive } from 'vue';

const state = reactive({ msg: '', err: false, show: false });
let timer: any;

export function useToast() {
  const toast = (msg: string, err = false) => {
    state.msg = msg; state.err = err; state.show = true;
    clearTimeout(timer);
    timer = setTimeout(() => { state.show = false; }, 2600);
  };
  return { state, toast };
}
